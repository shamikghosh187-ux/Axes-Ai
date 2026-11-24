"use client";

import { useMemo, useState } from "react";
import {
  Activity, ArrowRight, Atom, BookOpen, Check, ChevronDown, ChevronRight,
  CircleHelp, Command, FileText, FlaskConical, FolderKanban, Library,
  Menu, Microscope, Network, Plus, Search, Settings2, Sparkles, X,
  PanelLeftClose, PanelLeftOpen, Orbit, Clock3
} from "lucide-react";

type View = "Overview" | "Projects" | "Literature" | "Evidence" | "Hypotheses" | "Reports";
type Project = { id: number; title: string; domain: string; question: string; updated: string };
const nav = [
  { label: "WORKSPACE", items: [{ name: "Overview" as View, icon: Orbit }, { name: "Projects" as View, icon: FolderKanban }, { name: "Literature" as View, icon: BookOpen }] },
  { label: "DISCOVERY", items: [{ name: "Evidence" as View, icon: Network }, { name: "Hypotheses" as View, icon: Microscope }, { name: "Reports" as View, icon: FileText }] },
];

export default function Home() {
  const [view, setView] = useState<View>("Overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState("Astrophysics");
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const filtered = useMemo(() => projects.filter(p => (p.title + " " + p.question).toLowerCase().includes(search.toLowerCase())), [projects, search]);

  function createProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim() || !question.trim()) { setError("Add a title and research question to continue."); return; }
    setProjects(current => [{ id: Date.now(), title: title.trim(), domain, question: question.trim(), updated: "Just now" }, ...current]);
    setTitle(""); setQuestion(""); setError(""); setShowCreate(false); setView("Projects");
  }

  const descriptions: Record<View, string> = {
    Overview: "Your ideas, evidence, and discoveries — connected in one place.",
    Projects: "Give every important question its own research universe.",
    Literature: "Discover and organise scholarly work for your investigations.",
    Evidence: "Trace findings back to the sources that support them.",
    Hypotheses: "Explore competing explanations without losing sight of uncertainty.",
    Reports: "Turn a research trail into a clear, structured report."
  };

  return <main className="origin-app">
    <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""} ${mobileNav ? "sidebar-mobile-open" : ""}`}>
      <div className="brand-row">
        <div className="brand-symbol"><Atom size={20}/></div>
        {!collapsed && <div className="brand-copy"><b>ORIGIN</b><small>SCIENTIFIC RESEARCH</small></div>}
        <button className="icon-button collapse-button" onClick={() => setCollapsed(v => !v)} aria-label="Toggle sidebar">{collapsed ? <PanelLeftOpen size={16}/> : <PanelLeftClose size={16}/>}</button>
        <button className="icon-button mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18}/></button>
      </div>
      <button className="workspace-switch"><span className="workspace-avatar">S</span>{!collapsed && <><span className="workspace-label"><b>Personal workspace</b><small>Research space</small></span><ChevronDown size={15}/></>}</button>
      <button className="new-project-side" onClick={() => setShowCreate(true)}><Plus size={16}/>{!collapsed && <><span>New investigation</span><kbd>N</kbd></>}</button>
      <nav className="side-nav">{nav.map(group => <div className="nav-group" key={group.label}>{!collapsed && <p className="nav-label">{group.label}</p>}{group.items.map(item => { const Icon = item.icon; return <button key={item.name} className={`nav-item ${view === item.name ? "active" : ""}`} onClick={() => { setView(item.name); setMobileNav(false); }} title={collapsed ? item.name : undefined}><Icon size={17}/><span>{item.name}</span></button>; })}</div>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-divider"/><button className="nav-item"><Settings2 size={17}/><span>Preferences</span></button><button className="nav-item"><CircleHelp size={17}/><span>Help & feedback</span></button><div className="profile-row"><div className="profile-avatar">R</div>{!collapsed && <div className="profile-copy"><b>Researcher</b><small>Personal workspace</small></div>}</div></div>
    </aside>
    {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation"/>}
    <section className="main-shell">
      <header className="topbar">
        <div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={19}/></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={13}/><b>{view}</b></div></div>
        <div className="topbar-actions"><div className="global-search"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your workspace"/><kbd><Command size={10}/> K</kbd></div><button className="icon-button top-help" aria-label="Help"><CircleHelp size={17}/></button><div className="top-avatar">R</div></div>
      </header>
      <div className="page-content">
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot"/> THE SCIENTIFIC WORKSPACE</div><h1>{view === "Overview" ? "Research overview" : view}</h1><p>{descriptions[view]}</p></div><button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={16}/> New investigation</button></div>

        {view === "Overview" && <>
          <section className="hero-panel">
            <div className="hero-copy"><div className="hero-tag"><Sparkles size={13}/> A SPACE FOR BIG QUESTIONS</div><h2>Think beyond<br/>what is known.</h2><p>Follow ideas into evidence. Discover what has been explored, what remains uncertain, and where a new discovery might begin.</p><button className="hero-cta" onClick={() => setShowCreate(true)}>Begin an investigation <ArrowRight size={16}/></button></div>
            <div className="hero-visual" aria-hidden="true"><div className="hero-glow"/><div className="planet"><div className="planet-shade"/></div><div className="planet-ring ring-a"/><div className="planet-ring ring-b"/><span className="star star-a"/><span className="star star-b"/><span className="star star-c"/><span className="star star-d"/><div className="visual-label"><span/> IDEAS IN ORBIT</div></div>
            <div className="hero-index">01 <span>/ 04</span></div>
          </section>

          <section className="investigate-card"><div className="investigate-heading"><div><span className="section-kicker">YOUR NEXT DISCOVERY</span><h2>Start a new investigation</h2><p>Every discovery begins with a question worth following.</p></div><div className="investigate-icon"><Atom size={22}/></div></div><textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="What do you want to investigate? e.g. Could dark matter be explained by modifications to gravity?"/><div className="investigate-bottom"><span><FlaskConical size={13}/> Physics · Biology · Space · More</span><button className="primary-button" onClick={() => { if (question.trim()) { setTitle(""); setDomain("Astrophysics"); setShowCreate(true); } else setShowCreate(true); }}>Explore question <ArrowRight size={15}/></button></div></section>

          <div className="section-heading"><div><span className="section-kicker">THE RESEARCH TOOLKIT</span><h2>Everything connects.</h2><p>Move from discovery to evidence to understanding.</p></div></div>
          <div className="tool-grid">
            <button className="tool-card" onClick={() => setView("Literature")}><div className="tool-icon"><BookOpen size={19}/></div><b>Literature discovery</b><p>Find papers, follow citations, and build a focused reading library.</p><span>Explore literature <ArrowRight size={13}/></span><i>01</i></button>
            <button className="tool-card" onClick={() => setView("Evidence")}><div className="tool-icon"><Network size={19}/></div><b>Evidence mapping</b><p>Connect claims to source passages and see where findings agree.</p><span>Explore evidence <ArrowRight size={13}/></span><i>02</i></button>
            <button className="tool-card" onClick={() => setView("Hypotheses")}><div className="tool-icon"><Microscope size={19}/></div><b>Hypothesis lab</b><p>Compare explanations, assumptions, and unresolved questions.</p><span>Explore hypotheses <ArrowRight size={13}/></span><i>03</i></button>
            <button className="tool-card" onClick={() => setView("Reports")}><div className="tool-icon"><FileText size={19}/></div><b>Research reports</b><p>Shape a traceable research trail into a clear, useful report.</p><span>Explore reports <ArrowRight size={13}/></span><i>04</i></button>
          </div>

          <section className="universe-section"><div className="section-heading"><div><span className="section-kicker">YOUR RESEARCH UNIVERSE</span><h2>Projects that move ideas forward.</h2><p>Your investigations, gathered in one place.</p></div><button className="text-button" onClick={() => setView("Projects")}>All projects <ArrowRight size={14}/></button></div>
            {projects.length === 0 ? <div className="universe-empty"><div className="empty-orbit"><Orbit size={25}/></div><div><b>Your universe is waiting.</b><p>Create your first project and give a big question room to grow.</p></div><button className="secondary-button" onClick={() => setShowCreate(true)}><Plus size={14}/> Create first project</button></div> : <div className="project-list">{filtered.map(p => <button className="project-row" key={p.id} onClick={() => setView("Projects")}><div className="project-icon"><Atom size={17}/></div><div className="project-info"><b>{p.title}</b><span>{p.domain} · Updated {p.updated}</span><small>{p.question}</small></div><ChevronRight size={16}/></button>)}</div>}
          </section>
          <div className="principle-strip"><div className="principle-icon"><Microscope size={18}/></div><div><b>Evidence before certainty.</b><span>ORIGIN keeps sourced findings, interpretations, hypotheses, and unknowns distinct — so every conclusion has context.</span></div><Check size={16}/></div>
        </>}

        {view === "Projects" && <section className="surface-card full-page-card"><div className="card-heading"><div><h3>Your investigations</h3><p>{filtered.length} projects in this workspace</p></div><button className="secondary-button" onClick={() => setShowCreate(true)}><Plus size={14}/> New project</button></div>{filtered.length === 0 ? <div className="empty-state"><div className="empty-icon"><Orbit size={22}/></div><h4>No investigations yet</h4><p>Start with a question you genuinely want to understand.</p><button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={14}/> Create a project</button></div> : <div className="project-list">{filtered.map(p => <div className="project-row" key={p.id}><div className="project-icon"><Atom size={17}/></div><div className="project-info"><b>{p.title}</b><span>{p.domain} · Updated {p.updated}</span><small>{p.question}</small></div></div>)}</div>}</section>}
        {view !== "Overview" && view !== "Projects" && <section className="module-intro"><div className="module-symbol">{view === "Literature" ? <BookOpen/> : view === "Evidence" ? <Network/> : view === "Hypotheses" ? <Microscope/> : <FileText/>}</div><span className="section-kicker">ORIGIN MODULE</span><h2>{view}</h2><p>{descriptions[view]} This is the interface foundation; live research tools will be connected in the next development phase.</p><div className="module-status"><span/> Interface design phase</div></section>}
        <footer className="page-footer"><span>ORIGIN <i>·</i> SCIENTIFIC RESEARCH WORKSPACE</span><span>Curiosity, with a traceable path.</span></footer>
      </div>
    </section>
    {showCreate && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowCreate(false); }}><section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="create-title"><div className="modal-heading"><div><span className="modal-kicker">NEW INVESTIGATION</span><h2 id="create-title">Give your question a universe.</h2><p>Create a focused research project. You can refine it later.</p></div><button className="icon-button" onClick={() => setShowCreate(false)} aria-label="Close"><X size={18}/></button></div><form onSubmit={createProject}><label>Project title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. The mystery of dark matter" autoFocus/></label><label>Research domain<select value={domain} onChange={e => setDomain(e.target.value)}><option>Astrophysics</option><option>Physics</option><option>Biology</option><option>Chemistry</option><option>Earth science</option><option>Computer science</option><option>Other</option></select></label><label>Research question<textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="What do you want to investigate?" rows={4}/></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="primary-button">Create project <ArrowRight size={15}/></button></div></form><p className="modal-footnote"><Clock3 size={13}/> Your project starts as a clean research space.</p></section></div>}
  </main>;
}
