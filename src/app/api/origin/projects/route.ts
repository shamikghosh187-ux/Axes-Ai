import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to access ORIGIN." }, { status: 401 });
  const { data, error } = await supabase.from("origin_projects").select("id,title,domain,research_question,scope,status,created_at,updated_at").eq("owner_id", user.id).order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: "ORIGIN database is not ready. Apply database/origin-schema.sql in Supabase first." }, { status: 503 });
  return NextResponse.json({ projects: data ?? [] });
}
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to create a research project." }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid project details." }, { status: 400 });
  const input = body as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const domain = typeof input.domain === "string" ? input.domain.trim().slice(0, 80) : "general";
  const research_question = typeof input.research_question === "string" ? input.research_question.trim() : "";
  const scope = typeof input.scope === "string" ? input.scope.trim() : "";
  if (!title || title.length > 160 || !research_question || research_question.length > 6000 || scope.length > 6000) return NextResponse.json({ error: "Enter a title and research question. Keep each field within its length limit." }, { status: 400 });
  const { data, error } = await supabase.from("origin_projects").insert({ owner_id: user.id, title, domain, research_question, scope }).select("id,title,domain,research_question,scope,status,created_at,updated_at").single();
  if (error) return NextResponse.json({ error: "Could not save the project. Confirm the ORIGIN schema has been installed." }, { status: 503 });
  return NextResponse.json({ project: data }, { status: 201 });
}