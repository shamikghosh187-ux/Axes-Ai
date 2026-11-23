"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BookOpen, FileText, FlaskConical, Plus, Search, UploadCloud, Microscope, ExternalLink } from "lucide-react";
type Project = { id:string; title:string; domain:string; research_question:string; scope:string; status:string; created_at:string };
type Paper = { id?:string; external_id:string; title:string; doi:string|null; publication_year:number|null; cited_by_count:number; landing_url:string; authors:string[] };
type DocumentItem = { id:string; title:string; byte_size:number; parse_status:string; created_at:string };
export default function OriginPage() {
 const [projects,setProjects]=useState<Project[]>([]),[active,setActive]=useState(""),[documents,setDocuments]=useState<DocumentItem[]>([]),[papers,setPapers]=useState<Paper[]>([]),[savedPapers,setSavedPapers]=useState<Paper[]>([]);
 const [query,setQuery]=useState(""),[title,setTitle]=useState(""),[domain,setDomain]=useState("physics"),[question,setQuestion]=useState(""),[scope,setScope]=useState(""),[showCreate,setShowCreate]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const loadProjects = useCallback(async () => {
  const response = await fetch("/api/origin/projects");
  const data = await response.json();
  if (!response.ok) {
   setError(data.error || "Could not load projects.");
   return;
  }
  const items = (data.projects || []) as Project[];
  setProjects(items);
  setActive((currentId) =>
   currentId && items.some((item) => item.id === currentId)
    ? currentId
    : items[0]?.id || ""
  );
 }, []);

 const loadDocuments = useCallback(async (projectId: string) => {
  if (!projectId) {
   setDocuments([]);
   return;
  }
  const response = await fetch("/api/origin/documents?projectId=" + encodeURIComponent(projectId));
  const data = await response.json();
  if (response.ok) setDocuments(data.documents || []);
 }, []);

 const loadSavedPapers = useCallback(async (projectId: string) => {
  if (!projectId) {
   setSavedPapers([]);
   return;
  }
  const response = await fetch("/api/origin/literature?saved=1&projectId=" + encodeURIComponent(projectId));
  const data = await response.json();
  if (response.ok) setSavedPapers(data.papers || []);
 }, []);

 useEffect(() => {
  void loadProjects();
 }, [loadProjects]);

 useEffect(() => {
  void loadDocuments(active);
  void loadSavedPapers(active);
  setPapers([]);
 }, [active, loadDocuments, loadSavedPapers]);
 const current=projects.find(p=>p.id===active);
 async function createProject(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");setNotice("");const r=await fetch("/api/origin/projects",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,domain,research_question:question,scope})});const j=await r.json();if(!r.ok)setError(j.error||"Could not create project.");else{setTitle("");setQuestion("");setScope("");setShowCreate(false);setNotice("Research project created.");await loadProjects();setActive(j.project.id)}setBusy(false)}
 async function searchPapers(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(!active||!query.trim())return;setBusy(true);setError("");setPapers([]);const r=await fetch("/api/origin/literature?q="+encodeURIComponent(query)+"&projectId="+encodeURIComponent(active));const j=await r.json();if(!r.ok)setError(j.error||"Literature search failed.");else setPapers(j.papers||[]);setBusy(false)}
 async function savePaper(paper:Paper){const r=await fetch("/api/origin/literature",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({projectId:active,paper})});const j=await r.json();if(!r.ok)setError(j.error||"Could not save paper.");else{setNotice("Saved paper: "+paper.title);await loadSavedPapers(active)}}
 async function processDocument(id:string){setBusy(true);setError("");setNotice("");const r=await fetch("/api/origin/documents/"+encodeURIComponent(id)+"/process",{method:"POST"});const j=await r.json();if(!r.ok)setError(j.error||"Document processing failed.");else setNotice(j.message||("Indexed "+j.pageCount+" pages into "+j.chunkCount+" passages."));await loadDocuments(active);setBusy(false)}
 async function openDocument(id:string){const r=await fetch("/api/origin/documents/"+encodeURIComponent(id));const j=await r.json();if(!r.ok){setError(j.error||"Could not open document.");return}window.open(j.url,"_blank","noopener,noreferrer")}
 async function uploadPdf(e:React.ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file||!active)return;setBusy(true);setError("");setNotice("");const form=new FormData();form.append("projectId",active);form.append("file",file);const r=await fetch("/api/origin/documents",{method:"POST",body:form});const j=await r.json();if(!r.ok)setError(j.error||"Upload failed.");else{setNotice(j.message||"PDF uploaded.");await loadDocuments(active)}e.target.value="";setBusy(false)}
 return <main className="console-shell"><aside className="console-sidebar"><Link href="/dashboard" className="console-brand"><span className="auth-brand-mark">A</span> AXES <b>AI</b></Link><div className="console-nav-label">WORKSPACE</div><Link className="console-nav" href="/dashboard">Overview</Link><Link className="console-nav" href="/dashboard/providers">Providers</Link><Link className="console-nav" href="/dashboard/keys">Virtual API keys</Link><Link className="console-nav active" href="/dashboard/origin"><Microscope size={17}/> ORIGIN Research</Link><div className="console-sidebar-bottom">Scientific research workspace</div></aside>
 <section className="console-main"><header className="console-topbar"><div><span className="console-eyebrow">AXES AI / RESEARCH SYSTEM</span><h1>ORIGIN</h1></div><Link className="console-signout" href="/dashboard"><ArrowLeft size={15}/> Back to AXES</Link></header>
 <div className="console-welcome"><div><span className="console-eyebrow">EVIDENCE-LED INVESTIGATION</span><h2>Turn questions into traceable research.</h2><p>Discover scholarly literature, organize source documents and build an auditable foundation for scientific investigation.</p></div><span className="plan-chip">ORIGIN · PREVIEW</span></div>
 {error&&<p className="auth-error" role="alert">{error}</p>}{notice&&<p className="auth-notice" role="status">{notice}</p>}
 <div className="console-grid origin-work-grid"><section className="console-next origin-project-panel"><div className="origin-section-head"><div><span className="console-eyebrow">YOUR RESEARCH</span><h3>Projects</h3></div><button className="icon-button" onClick={()=>setShowCreate(v=>!v)}><Plus size={15}/> New project</button></div>
 {showCreate&&<form className="vault-form origin-create-form" onSubmit={createProject}><label>Project title<input required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Dark matter halo models"/></label><label>Scientific domain<select value={domain} onChange={e=>setDomain(e.target.value)}><option value="physics">Physics</option><option value="astronomy">Astronomy & astrophysics</option><option value="biology">Biology</option><option value="chemistry">Chemistry</option><option value="computer-science">Computer science</option><option value="mathematics">Mathematics</option><option value="general">General</option></select></label><label>Research question<textarea required maxLength={6000} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="What exactly do you want to investigate?"/></label><label>Scope and boundaries<textarea maxLength={6000} value={scope} onChange={e=>setScope(e.target.value)} placeholder="Optional: time period, methods, exclusions..."/></label><button className="auth-submit" disabled={busy}>{busy?"Saving...":"Create research project"}</button></form>}
 <div className="origin-project-list">{projects.length===0?<p className="vault-empty">No research projects yet. Create your first investigation to get started.</p>:projects.map(p=><button key={p.id} className={"origin-project-item "+(active===p.id?"selected":"")} onClick={()=>setActive(p.id)}><span><b>{p.title}</b><small>{p.domain} · {new Date(p.created_at).toLocaleDateString()}</small></span><span>→</span></button>)}</div></section>
 <section className="console-next"><span className="console-eyebrow">PROJECT BRIEF</span>{current?<><h3>{current.title}</h3><p>{current.research_question}</p>{current.scope&&<p className="origin-muted">Scope: {current.scope}</p>}</>:<><h3>Start with a question</h3><p>Create or select a project to begin literature discovery and document collection.</p></>}<div className="origin-stage-list"><span><BookOpen size={16}/> Literature discovery</span><span><FileText size={16}/> Source documents</span><span><FlaskConical size={16}/> Evidence & hypotheses</span></div></section></div>
 {current&&<div className="console-grid origin-work-grid origin-lower-grid"><section className="console-next"><div className="origin-section-head"><div><span className="console-eyebrow">SCHOLARLY DISCOVERY</span><h3>Find research papers</h3></div><BookOpen size={20}/></div><form className="origin-search" onSubmit={searchPapers}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search papers, concepts or authors..." aria-label="Search scholarly literature"/><button className="auth-submit" disabled={busy||!query.trim()}><Search size={16}/> Search</button></form><p className="origin-muted">Searches OpenAlex scholarly metadata. Abstract/full-text availability depends on each publisher and licence.</p><div className="origin-paper-list">{papers.map(p=><article className="origin-paper" key={p.external_id}><div><b>{p.title}</b><small>{p.authors.join(", ")||"Author details unavailable"} · {p.publication_year||"Year unknown"} · {p.cited_by_count} citations</small></div><div className="origin-paper-actions"><a href={p.landing_url} target="_blank" rel="noreferrer" aria-label="Open paper source"><ExternalLink size={15}/></a><button className="icon-button" onClick={()=>void savePaper(p)}>Save</button></div></article>)}</div><div className="origin-saved-papers"><span className="console-eyebrow">SAVED TO THIS PROJECT · {savedPapers.length}</span>{savedPapers.map(p=><article className="origin-paper" key={p.id||p.external_id}><div><b>{p.title}</b><small>{(p.authors||[]).join(", ")||"Author details unavailable"} · {p.publication_year||"Year unknown"}</small></div>{p.landing_url&&<a href={p.landing_url} target="_blank" rel="noreferrer" aria-label="Open saved paper"><ExternalLink size={15}/></a>}</article>)}</div></section>
 <section className="console-next"><div className="origin-section-head"><div><span className="console-eyebrow">PRIVATE DOCUMENT LIBRARY</span><h3>Research documents</h3></div><FileText size={20}/></div><label className="origin-upload"><UploadCloud size={20}/><b>{busy?"Working...":"Upload a research PDF"}</b><small>Private storage · PDF only · Maximum 20 MB</small><input type="file" accept="application/pdf,.pdf" onChange={uploadPdf} disabled={busy}/></label><div className="origin-document-list">{documents.length===0?<p className="vault-empty">No documents uploaded to this project.</p>:documents.map(d=><article className="origin-paper" key={d.id}><div><b>{d.title}</b><small>{(d.byte_size/1024/1024).toFixed(2)} MB · {d.parse_status}</small></div><div className="origin-paper-actions"><button className="icon-button" onClick={()=>void openDocument(d.id)}>Open PDF</button><button className="icon-button" disabled={busy} onClick={()=>void processDocument(d.id)}>{d.parse_status==="ready"?"Reprocess":"Extract & index"}</button><span className="status-on">{d.parse_status==="ready"?"Indexed":d.parse_status==="processing"?"Processing":d.parse_status==="failed"?"Retry needed":"Stored"}</span></div></article>)}</div><p className="origin-muted">PDFs are stored privately. Extract & index uses your connected Google Gemini key to transcribe pages and create page-labelled passages. Review extracted text before treating it as an exact quotation; scanned PDFs may need OCR review.</p></section></div>}
 <section className="console-next origin-roadmap"><span className="console-eyebrow">RESEARCH PIPELINE</span><h3>From source material to scientific report</h3><div className="origin-pipeline"><span>Literature</span><span>Documents</span><span>Evidence</span><span>Research gaps</span><span>Hypotheses</span><span>Report</span></div><p className="origin-muted">Project management, literature discovery and private PDF storage are available in this first integration. Automated extraction, evidence validation, hypothesis review and report generation require the next processing and evaluation stages. ORIGIN labels evidence, interpretation and hypotheses separately as those stages are added.</p></section>
 </section></main>;
}