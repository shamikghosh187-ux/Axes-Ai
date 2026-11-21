import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ documentId: string }> };
export async function GET(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to access this document." }, { status: 401 });
  const { documentId } = await context.params;
  const { data: document, error } = await supabase.from("origin_documents").select("id,title,storage_path").eq("id", documentId).eq("owner_id", user.id).maybeSingle();
  if (error || !document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  const { data, error: signedUrlError } = await supabase.storage.from("origin-documents").createSignedUrl(document.storage_path, 60, { download: document.title });
  if (signedUrlError || !data?.signedUrl) return NextResponse.json({ error: "Could not create a secure document link." }, { status: 503 });
  return NextResponse.json({ url: data.signedUrl, expiresIn: 60 });
}
export async function DELETE(_request: Request, context: RouteContext) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage documents." }, { status: 401 });
  const { documentId } = await context.params;
  const { data: document } = await supabase.from("origin_documents").select("id,storage_path").eq("id", documentId).eq("owner_id", user.id).maybeSingle();
  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  const { error: storageError } = await supabase.storage.from("origin-documents").remove([document.storage_path]);
  if (storageError) return NextResponse.json({ error: "Could not remove the private PDF file." }, { status: 503 });
  const { error } = await supabase.from("origin_documents").delete().eq("id", documentId).eq("owner_id", user.id);
  if (error) return NextResponse.json({ error: "The PDF was removed from storage but its record could not be deleted." }, { status: 503 });
  return NextResponse.json({ success: true });
}
