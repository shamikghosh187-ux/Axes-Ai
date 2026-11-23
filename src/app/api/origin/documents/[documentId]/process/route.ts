import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ documentId: string }> };
type ExtractedPage = { page_number: number; text: string };

function splitIntoChunks(text: string, maxChars = 3200): string[] {
  const normalized = text.replace(/\\r/g, "").replace(/[ \\t]+\\n/g, "\\n").trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + maxChars, normalized.length);
    if (end < normalized.length) {
      const boundary = normalized.lastIndexOf("\\n", end);
      if (boundary > start + Math.floor(maxChars * 0.6)) end = boundary;
    }
    const part = normalized.slice(start, end).trim();
    if (part.length >= 80) chunks.push(part);
    if (end >= normalized.length) break;
    start = Math.max(end - 240, start + 1);
  }
  return chunks;
}

export async function POST(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to process research documents." }, { status: 401 });

  const { documentId } = await context.params;
  const { data: document, error: documentError } = await supabase
    .from("origin_documents")
    .select("id,project_id,title,storage_path,byte_size")
    .eq("id", documentId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (documentError || !document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  if (document.byte_size > 12 * 1024 * 1024) return NextResponse.json({ error: "For AI-assisted extraction, this first version supports PDFs up to 12 MB. The original file remains safely stored." }, { status: 413 });

  const admin = createAdminClient();
  const { data: credential, error: credentialError } = await admin
    .from("provider_credentials")
    .select("encrypted_secret")
    .eq("user_id", user.id)
    .eq("provider", "google")
    .eq("enabled", true)
    .order("priority", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (credentialError || !credential?.encrypted_secret) {
    return NextResponse.json({ error: "Connect and enable a Google Gemini API key in AXES AI Providers to process PDFs. Your PDF is still stored privately." }, { status: 400 });
  }

  let apiKey: string;
  try { apiKey = decryptSecret(credential.encrypted_secret); }
  catch { return NextResponse.json({ error: "The saved Google key could not be decrypted. Check PROVIDER_KEYS_ENCRYPTION_SECRET." }, { status: 503 }); }

  const { data: file, error: downloadError } = await supabase.storage.from("origin-documents").download(document.storage_path);
  if (downloadError || !file) return NextResponse.json({ error: "Could not retrieve the private PDF from storage." }, { status: 503 });

  await supabase.from("origin_documents").update({ parse_status: "processing", parse_error: null }).eq("id", documentId).eq("owner_id", user.id);
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(110000),
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { text: "You are a careful scientific document transcription system. Read this born-digital or text-based PDF. Return JSON only, with exactly this shape: {\\"pages\\":[{\\"page_number\\":1,\\"text\\":\\"...\\"}]}. Include each page in its original PDF order, preserve scientific notation, equations in readable plain text, headings, table content and references. Do not summarize, invent, infer missing text, or merge text across pages. Use 1-based PDF page numbers. For pages with no readable text, use an empty string. If the full document cannot fit in the response, return the first consecutive pages only; never pretend omitted pages were processed. No markdown fences." },
            { inline_data: { mime_type: "application/pdf", data: bytes.toString("base64") } }
          ]
        }],
        generationConfig: { temperature: 0, responseMimeType: "application/json", maxOutputTokens: 8192 }
      })
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload && typeof payload === "object" && "error" in payload && (payload as {error?:{message?:string}}).error?.message;
      throw new Error(typeof message === "string" ? message.slice(0, 400) : "Gemini could not extract this PDF.");
    }
    const candidateText = payload && typeof payload === "object" && "candidates" in payload
      ? (payload as {candidates?:Array<{content?:{parts?:Array<{text?:string}>}}>} ).candidates?.[0]?.content?.parts?.map(part => part.text || "").join("") || ""
      : "";
    const parsed = JSON.parse(candidateText.replace(/^\uFEFF/, "")) as { pages?: ExtractedPage[] };
    if (!Array.isArray(parsed.pages) || parsed.pages.length === 0) throw new Error("No page text was returned. Try a smaller or text-selectable PDF.");
    const rows: Array<{ document_id:string; project_id:string; owner_id:string; ordinal:number; page_start:number; page_end:number; content:string }> = [];
    let ordinal = 0;
    for (const page of parsed.pages) {
      if (!Number.isInteger(page.page_number) || page.page_number < 1 || typeof page.text !== "string") continue;
      for (const chunk of splitIntoChunks(page.text)) {
        rows.push({ document_id: documentId, project_id: document.project_id, owner_id: user.id, ordinal: ordinal++, page_start: page.page_number, page_end: page.page_number, content: chunk });
      }
    }
    if (!rows.length) throw new Error("The PDF did not contain enough extractable text to index.");
    const { error: clearError } = await supabase.from("origin_document_chunks").delete().eq("document_id", documentId).eq("owner_id", user.id);
    if (clearError) throw new Error("Could not prepare the document index. Confirm the ORIGIN database schema is installed.");
    const { error: insertError } = await supabase.from("origin_document_chunks").insert(rows);
    if (insertError) throw new Error("Could not save extracted page text. Confirm the ORIGIN database schema is installed.");
    const pageCount = Math.max(...parsed.pages.map(page => Number.isInteger(page.page_number) ? page.page_number : 0));
    const { error: updateError } = await supabase.from("origin_documents").update({ parse_status: "ready", parse_error: null, page_count: pageCount }).eq("id", documentId).eq("owner_id", user.id);
    if (updateError) throw new Error("Text was indexed, but the document status could not be updated.");
    return NextResponse.json({ success: true, pageCount, chunkCount: rows.length, message: "AI-assisted page transcription and indexing completed. Review extracted passages before treating them as exact quotations." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document extraction failed.";
    await supabase.from("origin_documents").update({ parse_status: "failed", parse_error: message.slice(0, 500) }).eq("id", documentId).eq("owner_id", user.id);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
