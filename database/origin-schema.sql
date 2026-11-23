-- ORIGIN research workspace schema for AXES AI.
-- Apply in the Supabase SQL editor after reviewing the project and enabling Storage.
create extension if not exists pgcrypto;

create table if not exists public.origin_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  domain text not null default 'general' check (char_length(domain) <= 80),
  research_question text not null check (char_length(research_question) between 1 and 6000),
  scope text not null default '' check (char_length(scope) <= 6000),
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists origin_projects_owner_updated_idx on public.origin_projects(owner_id, updated_at desc);

create table if not exists public.origin_papers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.origin_projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'openalex',
  external_id text not null,
  title text not null,
  doi text,
  publication_year integer,
  authors jsonb not null default '[]'::jsonb,
  landing_url text,
  abstract text,
  created_at timestamptz not null default now(),
  unique(project_id, provider, external_id)
);
create index if not exists origin_papers_project_idx on public.origin_papers(project_id, created_at desc);

create table if not exists public.origin_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.origin_projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  storage_path text not null unique,
  mime_type text not null default 'application/pdf',
  byte_size bigint not null check (byte_size > 0 and byte_size <= 20971520),
  sha256 text,
  parse_status text not null default 'pending' check (parse_status in ('pending','processing','ready','failed')),
  parse_error text,
  page_count integer,
  created_at timestamptz not null default now()
);
create index if not exists origin_documents_project_idx on public.origin_documents(project_id, created_at desc);

create table if not exists public.origin_document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.origin_documents(id) on delete cascade,
  project_id uuid not null references public.origin_projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  ordinal integer not null,
  page_start integer,
  page_end integer,
  content text not null,
  created_at timestamptz not null default now(),
  unique(document_id, ordinal)
);
create index if not exists origin_chunks_project_idx on public.origin_document_chunks(project_id, document_id);

create table if not exists public.origin_research_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.origin_projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  question_snapshot text not null,
  status text not null default 'draft' check (status in ('draft','queued','running','completed','failed','cancelled')),
  config jsonb not null default '{}'::jsonb,
  model_id text,
  prompt_version text not null default 'origin-v1',
  error_code text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index if not exists origin_runs_project_idx on public.origin_research_runs(project_id, created_at desc);

create table if not exists public.origin_run_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.origin_research_runs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  sequence integer not null,
  stage text not null,
  status text not null,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(run_id, sequence)
);

create table if not exists public.origin_claims (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.origin_research_runs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  claim_kind text not null default 'finding',
  epistemic_status text not null default 'unverified' check (epistemic_status in ('sourced_fact','interpretation','hypothesis','unverified','contradicted','insufficient_evidence')),
  created_at timestamptz not null default now()
);
create table if not exists public.origin_claim_evidence (
  claim_id uuid not null references public.origin_claims(id) on delete cascade,
  chunk_id uuid not null references public.origin_document_chunks(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  relation text not null check (relation in ('supports','contradicts','context')),
  quote_start integer not null,
  quote_end integer not null,
  rationale text not null default '',
  primary key(claim_id, chunk_id, relation)
);

create table if not exists public.origin_hypotheses (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.origin_research_runs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  statement text not null,
  mechanism text not null default '',
  assumptions jsonb not null default '[]'::jsonb,
  predictions jsonb not null default '[]'::jsonb,
  falsifiers jsonb not null default '[]'::jsonb,
  uncertainties jsonb not null default '[]'::jsonb,
  status text not null default 'proposed',
  created_at timestamptz not null default now()
);
create table if not exists public.origin_hypothesis_reviews (
  id uuid primary key default gen_random_uuid(),
  hypothesis_id uuid not null references public.origin_hypotheses(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  critique jsonb not null default '{}'::jsonb,
  reviewer_model text,
  created_at timestamptz not null default now()
);
create table if not exists public.origin_reports (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.origin_research_runs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  version integer not null default 1,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(run_id, version)
);

-- Every table is owner-scoped. Policies also verify project/run ownership on child rows.
do $$
declare t text;
begin
  foreach t in array array['origin_projects','origin_papers','origin_documents','origin_document_chunks','origin_research_runs','origin_run_events','origin_claims','origin_claim_evidence','origin_hypotheses','origin_hypothesis_reviews','origin_reports']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

drop policy if exists "origin_projects_owner_all" on public.origin_projects;
create policy "origin_projects_owner_all" on public.origin_projects for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists "origin_papers_owner_all" on public.origin_papers;
create policy "origin_papers_owner_all" on public.origin_papers for all to authenticated using (owner_id = (select auth.uid()) and exists(select 1 from public.origin_projects p where p.id = project_id and p.owner_id = (select auth.uid()))) with check (owner_id = (select auth.uid()) and exists(select 1 from public.origin_projects p where p.id = project_id and p.owner_id = (select auth.uid())));

drop policy if exists "origin_documents_owner_all" on public.origin_documents;
create policy "origin_documents_owner_all" on public.origin_documents for all to authenticated using (owner_id = (select auth.uid()) and exists(select 1 from public.origin_projects p where p.id = project_id and p.owner_id = (select auth.uid()))) with check (owner_id = (select auth.uid()) and exists(select 1 from public.origin_projects p where p.id = project_id and p.owner_id = (select auth.uid())));

drop policy if exists "origin_chunks_owner_all" on public.origin_document_chunks;
create policy "origin_chunks_owner_all" on public.origin_document_chunks for all to authenticated using (owner_id = (select auth.uid()) and exists(select 1 from public.origin_projects p where p.id = project_id and p.owner_id = (select auth.uid()))) with check (owner_id = (select auth.uid()) and exists(select 1 from public.origin_projects p where p.id = project_id and p.owner_id = (select auth.uid())));

drop policy if exists "origin_runs_owner_all" on public.origin_research_runs;
create policy "origin_runs_owner_all" on public.origin_research_runs for all to authenticated using (owner_id = (select auth.uid()) and exists(select 1 from public.origin_projects p where p.id = project_id and p.owner_id = (select auth.uid()))) with check (owner_id = (select auth.uid()) and exists(select 1 from public.origin_projects p where p.id = project_id and p.owner_id = (select auth.uid())));

drop policy if exists "origin_run_events_owner_all" on public.origin_run_events;
create policy "origin_run_events_owner_all" on public.origin_run_events for all to authenticated using (owner_id = (select auth.uid()) and exists(select 1 from public.origin_research_runs r where r.id = run_id and r.owner_id = (select auth.uid()))) with check (owner_id = (select auth.uid()) and exists(select 1 from public.origin_research_runs r where r.id = run_id and r.owner_id = (select auth.uid())));

drop policy if exists "origin_claims_owner_all" on public.origin_claims;
create policy "origin_claims_owner_all" on public.origin_claims for all to authenticated using (owner_id = (select auth.uid()) and exists(select 1 from public.origin_research_runs r where r.id = run_id and r.owner_id = (select auth.uid()))) with check (owner_id = (select auth.uid()) and exists(select 1 from public.origin_research_runs r where r.id = run_id and r.owner_id = (select auth.uid())));

drop policy if exists "origin_claim_evidence_owner_all" on public.origin_claim_evidence;
create policy "origin_claim_evidence_owner_all" on public.origin_claim_evidence for all to authenticated using (owner_id = (select auth.uid()) and exists(select 1 from public.origin_claims c where c.id = claim_id and c.owner_id = (select auth.uid())) and exists(select 1 from public.origin_document_chunks d where d.id = chunk_id and d.owner_id = (select auth.uid()))) with check (owner_id = (select auth.uid()) and exists(select 1 from public.origin_claims c where c.id = claim_id and c.owner_id = (select auth.uid())) and exists(select 1 from public.origin_document_chunks d where d.id = chunk_id and d.owner_id = (select auth.uid())));

drop policy if exists "origin_hypotheses_owner_all" on public.origin_hypotheses;
create policy "origin_hypotheses_owner_all" on public.origin_hypotheses for all to authenticated using (owner_id = (select auth.uid()) and exists(select 1 from public.origin_research_runs r where r.id = run_id and r.owner_id = (select auth.uid()))) with check (owner_id = (select auth.uid()) and exists(select 1 from public.origin_research_runs r where r.id = run_id and r.owner_id = (select auth.uid())));

drop policy if exists "origin_reviews_owner_all" on public.origin_hypothesis_reviews;
create policy "origin_reviews_owner_all" on public.origin_hypothesis_reviews for all to authenticated using (owner_id = (select auth.uid()) and exists(select 1 from public.origin_hypotheses h where h.id = hypothesis_id and h.owner_id = (select auth.uid()))) with check (owner_id = (select auth.uid()) and exists(select 1 from public.origin_hypotheses h where h.id = hypothesis_id and h.owner_id = (select auth.uid())));

drop policy if exists "origin_reports_owner_all" on public.origin_reports;
create policy "origin_reports_owner_all" on public.origin_reports for all to authenticated using (owner_id = (select auth.uid()) and exists(select 1 from public.origin_research_runs r where r.id = run_id and r.owner_id = (select auth.uid()))) with check (owner_id = (select auth.uid()) and exists(select 1 from public.origin_research_runs r where r.id = run_id and r.owner_id = (select auth.uid())));

-- Run once in Supabase Storage if the bucket does not already exist.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('origin-documents', 'origin-documents', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "origin_pdf_insert_own_folder" on storage.objects;
create policy "origin_pdf_insert_own_folder" on storage.objects for insert to authenticated with check (bucket_id = 'origin-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "origin_pdf_select_own_folder" on storage.objects;
create policy "origin_pdf_select_own_folder" on storage.objects for select to authenticated using (bucket_id = 'origin-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "origin_pdf_delete_own_folder" on storage.objects;
create policy "origin_pdf_delete_own_folder" on storage.objects for delete to authenticated using (bucket_id = 'origin-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- The authenticated application client uses these grants together with the owner-scoped RLS policies above.
grant select, insert, update, delete on public.origin_projects to authenticated;
grant select, insert, update, delete on public.origin_papers to authenticated;
grant select, insert, update, delete on public.origin_documents to authenticated;
grant select, insert, update, delete on public.origin_document_chunks to authenticated;
grant select, insert, update, delete on public.origin_research_runs to authenticated;
grant select, insert, update, delete on public.origin_run_events to authenticated;
grant select, insert, update, delete on public.origin_claims to authenticated;
grant select, insert, update, delete on public.origin_claim_evidence to authenticated;
grant select, insert, update, delete on public.origin_hypotheses to authenticated;
grant select, insert, update, delete on public.origin_hypothesis_reviews to authenticated;
grant select, insert, update, delete on public.origin_reports to authenticated;
