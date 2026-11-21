import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash, randomUUID } from "node:crypto";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BYTES = 20 * 1024 * 1024;
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to view research documents." }, { status: 401 });
  const projectId = new URL(request.url).searchParams.get("projectId") ?? "";
  if (!projectId) return NextResponse.json({ error: "Choose a project." }, { status: 400 });
  const { data, error } = await supabase.from("origin_documents").select("id,title,byte_size,parse_status,page_count,created_at").eq("project_id", projectId).eq("owner_id", user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load documents. Check the ORIGIN schema." }, { status: 503 });
  return NextResponse.json({ documents: data ?? [] });
}
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to upload documents." }, { status: 401 });
  const form = await request.formData(), projectId = String(form.get("projectId") ?? ""), file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a PDF file." }, { status: 400 });
  if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) return NextResponse.json({ error: "Only PDF documents are accepted." }, { status: 415 });
  if (file.size < 8 || file.size > MAX_BYTES) return NextResponse.json({ error: "PDF must be between 8 bytes and 20 MB." }, { status: 413 });
  const { data: project } = await supabase.from("origin_projects").select("id").eq("id", projectId).eq("owner_id", user.id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Research project not found." }, { status: 404 });
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") return NextResponse.json({ error: "The selected file does not have a valid PDF signature." }, { status: 415 });
  const id = randomUUID(), path = user.id + "/" + projectId + "/" + id + ".pdf";
  const { error: uploadError } = await supabase.storage.from("origin-documents").upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (uploadError) return NextResponse.json({ error: "Private PDF storage is not configured. Apply the ORIGIN SQL setup first." }, { status: 503 });
  const { data, error } = await supabase.from("origin_documents").insert({ id, project_id: projectId, owner_id: user.id, title: file.name.slice(0, 240), storage_path: path, mime_type: "application/pdf", byte_size: file.size, sha256: createHash("sha256").update(bytes).digest("hex"), parse_status: "pending" }).select("id,title,byte_size,parse_status,created_at").single();
  if (error) { await supabase.storage.from("origin-documents").remove([path]); return NextResponse.json({ error: "Could not register the uploaded PDF. Check the ORIGIN schema." }, { status: 503 }); }
  return NextResponse.json({ document: data, message: "PDF stored privately. Text extraction and page indexing are the next ingestion stage." }, { status: 201 });
}