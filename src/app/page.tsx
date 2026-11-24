"use client";

import { useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowRight, Atom, BookOpen, Check,
  ChevronDown, ChevronRight, CircleHelp, FileText,
  FlaskConical, FolderKanban, LayoutDashboard, Library, Menu, Plus,
  Search, Settings2, Sparkles, X, Clock3, MoreHorizontal,
  PanelLeftClose, PanelLeftOpen, Microscope, Network, SlidersHorizontal
} from "lucide-react";

type View = "Overview" | "Projects" | "Literature" | "Research runs" | "Evidence" | "Reports";
type Project = { id: number; title: string; domain: string; question: string; updated: string };

const navGroups = [
  { label: "WORKSPACE", items: [
    { name: "Overview" as View, icon: LayoutDashboard },
    { name: "Projects" as View, icon: FolderKanban },
    { name: "Literature" as View, icon: BookOpen },
  ]},
  { label: "RESEARCH", items: [
    { name: "Research runs" as View, icon: Activity },
    { name: "Evidence" as View, icon: Network },
    { name: "Reports" as View, icon: FileText },
  ]},
];

export default function Home() {
  const [view, setView] = useState<View>("Overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState("Physics");
  const [question, setQuestion] = useState("");
  const [scope, setScope] = useState("2018–present");
  const [error, setError] = useState("");

  const filteredProjects = useMemo(
    () => projects.filter((project) => project.title.toLowerCase().includes(query.toLowerCase())),
    [projects, query]
  );

  function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !question.trim()) {
      setError("Add a project title and research question to continue.");
      return;
    }
    setProjects((current) => [{ id: Date.now(), title: title.trim(), domain, question: question.trim(), updated: "Just now" }, ...current]);
    setTitle("");
    setQuestion("");
    setError("");
    setShowCreate(false);
    setView("Projects");
  }

  const pageTitle = view === "Overview" ? "Research overview" : view;
  const pageDescription: Record<View, string> = {
    Overview: "Your research, sources, and investigations in one place.",
    Projects: "Organise questions into focused, traceable investigations.",
    Literature: "Discover and organise scholarly work for your projects.",
    "Research runs": "Follow each stage of an investigation from planning to report.",
    Evidence: "Inspect the passages behind findings and interpretations.",
    Reports: "Review research briefs, limitations, and references."
  };

  return (
    <main className="origin-app">
      <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""} ${mobileNav ? "sidebar-mobile-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-symbol"><Atom size={20} strokeWidth={1.8} /></div>
          {!collapsed && <div className="brand-copy"><span>ORIGIN</span><small>RESEARCH WORKSPACE</small></div>}
          <button className="icon-button collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar">
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
          <button className="icon-button mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>

        <button className="workspace-switch">
          <div className="workspace-avatar">S</div>
          {!collapsed && <><span><b>Personal workspace</b><small>Free workspace</small></span><ChevronDown size={15} /></>}
        </button>

        <button className="new-project-side" onClick={() => setShowCreate(true)}>
          <Plus size={16} /><span>{collapsed ? "" : "New project"}</span><kbd>{collapsed ? "+" : "N"}</kbd>
        </button>

        <nav className="side-nav">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              {!collapsed && <p className="nav-label">{group.label}</p>}
              {group.items.map((item) => {
                const Icon = item.icon;
                return <button key={item.name} className={`nav-item ${view === item.name ? "active" : ""}`} onClick={() => { setView(item.name); setMobileNav(false); }} title={collapsed ? item.name : undefined}>
                  <Icon size={17} strokeWidth={1.8} /><span>{item.name}</span>
                </button>;
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-divider" />
          <button className="nav-item" title={collapsed ? "Settings" : undefined}><Settings2 size={17} /><span>Settings</span></button>
          <button className="nav-item" title={collapsed ? "Help & feedback" : undefined}><CircleHelp size={17} /><span>Help & feedback</span></button>
          <div className="profile-row">
            <div className="profile-avatar">R</div>
            {!collapsed && <div className="profile-copy"><b>Researcher</b><small>Personal account</small></div>}
            {!collapsed && <MoreHorizontal size={17} className="profile-more" />}
          </div>
        </div>
      </aside>

      {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Close menu" />}

      <section className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={19} /></button>
            <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><b>{view}</b></div>
          </div>
          <div className="topbar-actions">
            <div className="global-search"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search workspace" /><kbd>⌘ K</kbd></div>
            <button className="icon-button top-help" aria-label="Help"><CircleHelp size={17} /></button>
            <div className="top-avatar">R</div>
          </div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div><div className="eyebrow"><span className="eyebrow-dot" /> SCIENTIFIC WORKSPACE</div><h1>{pageTitle}</h1><p>{pageDescription[view]}</p></div>
            <button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={16} /> New project</button>
          </div>

          {view === "Overview" && (
            <>
              <section className="welcome-panel">
                <div className="welcome-copy">
                  <div className="welcome-tag"><Sparkles size={13} /> A clearer way to investigate</div>
                  <h2>Good research starts<br />with a better question.</h2>
                  <p>Build a research trail you can actually inspect. Bring papers together, examine evidence, and compare possible explanations.</p>
                  <button className="welcome-cta" onClick={() => setShowCreate(true)}>Start an investigation <ArrowRight size={16} /></button>
                </div>
                <div className="orbital-art" aria-hidden="true">
                  <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
                  <div className="orbit-core"><Atom size={42} strokeWidth={1.1} /></div>
                  <span className="orbit-node node-one" /><span className="orbit-node node-two" /><span className="orbit-node node-three" />
                  <div className="art-caption"><span /> TRACEABLE BY DESIGN</div>
                </div>
              </section>

              <div className="section-heading"><div><h2>Your workspace</h2><p>A snapshot of your research activity.</p></div><button className="text-button" onClick={() => setView("Projects")}>View projects <ArrowRight size={14} /></button></div>
              <div className="metric-grid">
                <div className="metric-card"><div className="metric-top"><span>PROJECTS</span><FolderKanban size={16} /></div><strong>{projects.length.toString().padStart(2, "0")}</strong><small>{projects.length === 0 ? "Ready for your first investigation" : "In this workspace"}</small></div>
                <div className="metric-card"><div className="metric-top"><span>RESEARCH RUNS</span><Activity size={16} /></div><strong>—</strong><small>No investigations started yet</small></div>
                <div className="metric-card"><div className="metric-top"><span>LIBRARY SOURCES</span><Library size={16} /></div><strong>—</strong><small>Your collected literature will appear here</small></div>
                <div className="metric-card"><div className="metric-top"><span>REPORTS</span><FileText size={16} /></div><strong>—</strong><small>Research briefs will be saved here</small></div>
              </div>

              <div className="content-grid">
                <section className="surface-card projects-card">
                  <div className="card-heading"><div><h3>Recent projects</h3><p>Your latest research spaces</p></div><button className="icon-button" aria-label="More project options"><MoreHorizontal size={18} /></button></div>
                  {projects.length === 0 ? <div className="empty-state"><div className="empty-icon"><FolderKanban size={22} /></div><h4>Your research begins here</h4><p>Create a project to give your question a home. Your sources, evidence, and reports will stay organised together.</p><button className="secondary-button" onClick={() => setShowCreate(true)}><Plus size={15} /> Create your first project</button></div> :
                    <div className="project-list">{filteredProjects.map((project) => <button className="project-row" key={project.id} onClick={() => setView("Projects")}><div className="project-icon"><FlaskConical size={17} /></div><div className="project-info"><b>{project.title}</b><span>{project.domain} · {project.updated}</span></div><ChevronRight size={16} /></button>)}</div>}
                </section>
                <section className="surface-card activity-card">
                  <div className="card-heading"><div><h3>Research activity</h3><p>A transparent record of your work</p></div><Clock3 size={17} /></div>
                  <div className="activity-empty"><div className="activity-line"><span className="activity-dot" /></div><div><b>No activity yet</b><p>When you run an investigation, its stages and updates will appear here.</p></div></div>
                  <div className="activity-foot"><span className="live-indicator" /> Research trace is ready</div>
                </section>
              </div>

              <section className="principle-strip"><div className="principle-icon"><Microscope size={18} /></div><div><b>Evidence before certainty.</b><span>ORIGIN separates sourced findings, interpretations, hypotheses, and unknowns—so you can see what the research really supports.</span></div><ArrowDownRight size={17} /></section>
            </>
          )}

          {view === "Projects" && (
            <section className="surface-card full-page-card">
              <div className="card-heading"><div><h3>All projects</h3><p>{projects.length} projects in your workspace</p></div><button className="secondary-button" onClick={() => setShowCreate(true)}><Plus size={15} /> New project</button></div>
              {projects.length === 0 ? <div className="empty-state large-empty"><div className="empty-icon"><FolderKanban size={22} /></div><h4>No projects yet</h4><p>Create a project around a research question. You can add literature, documents, and investigation runs later.</p><button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={15} /> Create a project</button></div> :
                <div className="project-list">{filteredProjects.map((project) => <div className="project-row" key={project.id}><div className="project-icon"><FlaskConical size={17} /></div><div className="project-info"><b>{project.title}</b><span>{project.domain} · Updated {project.updated}</span><small>{project.question}</small></div><ChevronRight size={16} /></div>)}</div>}
            </section>
          )}

          {view !== "Overview" && view !== "Projects" && (
            <section className="surface-card coming-card">
              <div className="coming-icon">{view === "Literature" ? <BookOpen /> : view === "Research runs" ? <Activity /> : view === "Evidence" ? <Network /> : <FileText />}</div>
              <span className="coming-label">WORKSPACE MODULE</span><h2>{view}</h2>
              <p>This area is part of the ORIGIN interface plan. We’re laying out the complete workspace first; its live research functions will be connected in a later phase.</p>
              <div className="coming-note"><Check size={15} /> Interface foundation in progress</div>
            </section>
          )}

          <footer className="page-footer"><span>ORIGIN <i>·</i> Research workspace</span><span>Built for careful, traceable investigation</span></footer>
        </div>
      </section>

      {showCreate && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
        <section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="create-title">
          <div className="modal-heading"><div><span className="modal-kicker">NEW WORKSPACE</span><h2 id="create-title">Create a research project</h2><p>Start with a question. You can refine the scope at any time.</p></div><button className="icon-button" onClick={() => setShowCreate(false)} aria-label="Close"><X size={18} /></button></div>
          <form onSubmit={createProject}>
            <label>Project title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Magnetic reconnection in solar flares" autoFocus /></label>
            <label>Research domain<select value={domain} onChange={(e) => setDomain(e.target.value)}><option>Physics</option><option>Astrophysics</option><option>Biology</option><option>Chemistry</option><option>Earth science</option><option>Computer science</option><option>Other</option></select></label>
            <label>Research question<textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What do you want to investigate, and what are you trying to understand?" rows={4} /></label>
            <label>Initial literature period<select value={scope} onChange={(e) => setScope(e.target.value)}><option>2018–present</option><option>2010–present</option><option>2000–present</option><option>All available years</option></select></label>
            {error && <p className="form-error">{error}</p>}
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="primary-button">Create project <ArrowRight size={15} /></button></div>
          </form>
          <p className="modal-footnote"><SlidersHorizontal size={13} /> Scope and filters can be adjusted later.</p>
        </section>
      </div>}
    </main>
  );
}
