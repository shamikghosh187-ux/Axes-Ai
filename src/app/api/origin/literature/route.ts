import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
type Work = { id?: string; doi?: string | null; title?: string | null; publication_year?: number | null; cited_by_count?: number; primary_location?: { landing_page_url?: string | null } | null; authorships?: Array<{ author?: { display_name?: string } }> };
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to search literature." }, { status: 401 });
  const url = new URL(request.url), query = (url.searchParams.get("q") ?? "").trim().slice(0, 300), projectId = url.searchParams.get("projectId") ?? "";
  if (!query) return NextResponse.json({ papers: [] });
  if (!projectId) return NextResponse.json({ error: "Choose a research project first." }, { status: 400 });
  const { data: project } = await supabase.from("origin_projects").select("id").eq("id", projectId).eq("owner_id", user.id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Research project not found." }, { status: 404 });
  const endpoint = new URL("https://api.openalex.org/works");
  endpoint.searchParams.set("search", query); endpoint.searchParams.set("per-page", "12"); endpoint.searchParams.set("select", "id,doi,title,publication_year,cited_by_count,primary_location,authorships");
  try {
    const response = await fetch(endpoint, { headers: { "User-Agent": "AXES-AI-ORIGIN/1.0 (scholarly discovery)" }, signal: AbortSignal.timeout(15000), next: { revalidate: 3600 } });
    if (!response.ok) return NextResponse.json({ error: "The scholarly literature provider is temporarily unavailable." }, { status: 502 });
    const payload: unknown = await response.json();
    const results = payload && typeof payload === "object" && "results" in payload && Array.isArray((payload as {results: unknown[]}).results) ? (payload as {results: Work[]}).results : [];
    const papers = results.filter((w) => typeof w.id === "string" && typeof w.title === "string").map((w) => ({ external_id: w.id!, title: w.title!, doi: w.doi ?? null, publication_year: w.publication_year ?? null, cited_by_count: w.cited_by_count ?? 0, landing_url: w.primary_location?.landing_page_url ?? w.doi ?? w.id, authors: (w.authorships ?? []).slice(0, 8).map((a) => a.author?.display_name).filter((n): n is string => Boolean(n)) }));
    return NextResponse.json({ provider: "OpenAlex", papers });
  } catch { return NextResponse.json({ error: "Could not reach the scholarly literature provider. Try again shortly." }, { status: 502 }); }
}
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to save papers." }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid paper." }, { status: 400 });
  const input = body as Record<string, unknown>, projectId = typeof input.projectId === "string" ? input.projectId : "", paper = input.paper && typeof input.paper === "object" ? input.paper as Record<string, unknown> : {};
  const externalId = typeof paper.external_id === "string" ? paper.external_id : "", title = typeof paper.title === "string" ? paper.title.slice(0, 1000) : "";
  if (!projectId || !externalId.startsWith("https://openalex.org/") || !title) return NextResponse.json({ error: "Invalid paper details." }, { status: 400 });
  const { data: project } = await supabase.from("origin_projects").select("id").eq("id", projectId).eq("owner_id", user.id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Research project not found." }, { status: 404 });
  const { data, error } = await supabase.from("origin_papers").upsert({ project_id: projectId, owner_id: user.id, provider: "openalex", external_id: externalId, title, doi: typeof paper.doi === "string" ? paper.doi : null, publication_year: typeof paper.publication_year === "number" ? paper.publication_year : null, authors: Array.isArray(paper.authors) ? paper.authors.slice(0, 8) : [], landing_url: typeof paper.landing_url === "string" ? paper.landing_url : null }, { onConflict: "project_id,provider,external_id" }).select("id,title,publication_year,doi,landing_url").single();
  if (error) return NextResponse.json({ error: "Could not save this paper. Check the ORIGIN database setup." }, { status: 503 });
  return NextResponse.json({ paper: data }, { status: 201 });
}