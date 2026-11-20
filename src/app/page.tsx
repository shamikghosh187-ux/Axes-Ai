"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Atom, ArrowUp, ChevronDown, Plus, Search, FileText,
  Settings2, Sparkles, Globe2, Paperclip, BrainCircuit,
  PanelLeftClose, Orbit, Library, SlidersHorizontal,
  MoreHorizontal, Check, Eye, EyeOff, KeyRound, ShieldCheck, Trash2, Pin, Download, RefreshCw, Microscope, X, GraduationCap, Zap, BookOpen, ClipboardCheck, Code2, GitBranch
} from "lucide-react";

type ResearchTurn = { id: string; question: string; answer: string; model: string; provider: string; error?: string };
type ResearchProject = { id: string; title: string; questions: string[]; answer: string; model: string; updatedAt: number; turns?: ResearchTurn[]; personaMode?: string; researchMode?: boolean };

function makeConversationTitle(message: string): string {
  const clean = message.replace(/\s+/g, " ").trim();
  const normalized = clean.toLowerCase().replace(/[!?.,]+$/g, "").trim();
  if (/^(hey|hi|hello|heya|hii+|helo|good morning|good afternoon|good evening|what'?s up|sup|yo)(\s+(there|axes ai|everyone))?$/.test(normalized)) return "A Friendly Greeting";
  if (/^(how are you|how's it going|how are you doing)$/.test(normalized)) return "A Friendly Check-in";
  if (/^(thanks|thank you|thx|ty)$/.test(normalized)) return "A Quick Thank You";
  if (/^(bye|goodbye|see you|see ya)$/.test(normalized)) return "A Quick Goodbye";
  if (/^(who are you|what are you|introduce yourself)$/.test(normalized)) return "Getting to Know AXES AI";
  if (/^(help|help me|i need help)$/.test(normalized)) return "Getting Some Help";
  const withoutLead = clean.replace(/^(please\s+)?(explain|describe|teach me|help me understand|help me with|tell me about|what is|what are|how does|how do|write|create|make|build|solve|calculate|derive|summarize|compare|analyze|analyse)\s+/i, "").trim();
  const topic = withoutLead || clean;
  const title = topic.charAt(0).toUpperCase() + topic.slice(1);
  return title.length > 48 ? title.slice(0, 45).trimEnd() + "…" : title;
}


function renderInlineMarkdown(value: string, keyPrefix: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\x60[^`]+\x60|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s]+)/g;
  return value.split(pattern).filter(Boolean).map((part, index) => {
    const key = keyPrefix + "-" + index;
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) return <em key={key}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={key}>{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) return <a key={key} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>;
    if (/^https?:\/\//.test(part)) return <a key={key} href={part} target="_blank" rel="noreferrer">{part}</a>;
    return <span key={key}>{part}</span>;
  });
}

function renderAnswerMarkdown(source: string): ReactNode {
  // Recover provider output that flattens a multi-row rubric into one line:
  // **1. Criterion** | marks | what earns marks | deductions | **2. Criterion** | ...
  const rubricRows: string[][] = [];
  const rubricPattern = /\*\*\d+\.\s*[^*]+\*\*/g;
  const rubricMatches = [...source.matchAll(rubricPattern)];
  if (rubricMatches.length >= 2) {
    for (let index = 0; index < rubricMatches.length; index++) {
      const start = rubricMatches[index].index ?? 0;
      const end = index + 1 < rubricMatches.length ? (rubricMatches[index + 1].index ?? source.length) : source.length;
      const segment = source.slice(start, end).replace(/^\s*\|\s*/, "").replace(/\s*\|\s*$/, "").trim();
      const cells = segment.split("|").map(cell => cell.trim());
      if (cells.length >= 3) rubricRows.push(cells.slice(0, 4));
    }
  }
  if (rubricRows.length >= 2 && rubricRows.every(row => row.length >= 3)) {
    return <div className="answer-markdown"><div className="answer-table-wrap"><table><thead><tr><th>Criterion</th><th>Points</th><th>What earns marks</th><th>Common deductions</th></tr></thead><tbody>{rubricRows.map((row, index) => <tr key={"rubric-" + index}><td>{renderInlineMarkdown(row[0], "rubric-title-" + index)}</td><td>{renderInlineMarkdown(row[1] || "", "rubric-points-" + index)}</td><td>{renderInlineMarkdown(row[2] || "", "rubric-evidence-" + index)}</td><td>{renderInlineMarkdown(row[3] || "", "rubric-deductions-" + index)}</td></tr>)}</tbody></table></div></div>;
  }

  const hasMarkdownTable = /^\s*\|.*\|\s*\n\s*\|?\s*:?-{2,}/m.test(source);
  const pipeNormalized = hasMarkdownTable ? source : source.replace(/\s+\|\s+/g, "\n\n");
  const normalizedSource = pipeNormalized.replace(/<br\s*\/?>/gi, "\n").replace(/\r\n?/g, "\n").replace(/\s*\|\|\s*/g, "\n\n").replace(/\s+\|\s+(?=\*\*[^*]+\*\*)/g, "\n\n").replace(/\s+\|\s+(?=(?:Snap|Blocking|Formation):)/g, "\n\n").replace(/\s*•\s*/g, "\n- ");
  const lines = normalizedSource.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    if (/^\x60\x60\x60/.test(line)) {
      const language = line.slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^\x60\x60\x60/.test(lines[i].trim())) code.push(lines[i++]);
      i++;
      blocks.push(<div className="answer-code-block" key={"code-" + i}><div className="answer-code-toolbar"><span>{language || "CODE"}</span><button type="button" onClick={() => { void navigator.clipboard.writeText(code.join("\n")); }}>Copy code</button></div><pre data-language={language}><code>{code.join("\n")}</code></pre></div>);
      continue;
    }
    if (/^(---+|\*\*\*|___)$/.test(line)) { blocks.push(<hr key={"hr-" + i++}/>); continue; }
    if (line.startsWith("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const parseCells = (row: string) => {
        const trimmed = row.trim();
        const normalized = trimmed.startsWith("|") ? trimmed.replace(/^\|/, "").replace(/\|$/, "") : trimmed;
        return normalized.split("|").map(cell => cell.trim());
      };
      const headers = parseCells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length) {
        // AI providers often insert blank lines between otherwise valid table rows.
        // Skip those blanks, but stop before the next real paragraph or list.
        while (i < lines.length && !lines[i].trim()) i++;
        if (i >= lines.length) break;
        const candidate = lines[i].trim();
        if (candidate.startsWith("|") || candidate.includes("|")) {
          const cells = parseCells(candidate);
          if (cells.length >= headers.length) {
            rows.push(cells.slice(0, headers.length));
          } else if (cells.length > 1) {
            rows.push([...cells, ...Array(headers.length - cells.length).fill("")]);
          }
          i++;
          continue;
        }
        break;
      }
      blocks.push(<div className="answer-table-wrap" key={"table-" + i}><table><thead><tr>{headers.map((cell, n) => <th key={n}>{renderInlineMarkdown(cell, "th-" + i + "-" + n)}</th>)}</tr></thead><tbody>{rows.map((row, n) => <tr key={n}>{headers.map((_, col) => <td key={col}>{renderInlineMarkdown(row[col] || "", "td-" + i + "-" + n + "-" + col)}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) { const Tag = ("h" + Math.min(heading[1].length + 1, 6)) as "h2" | "h3" | "h4" | "h5" | "h6"; blocks.push(<Tag key={"heading-" + i}>{renderInlineMarkdown(heading[2], "heading-" + i)}</Tag>); i++; continue; }
    if (/^\s*>/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i].trim())) quote.push(lines[i++].trim().replace(/^>\s?/, ""));
      blocks.push(<blockquote key={"quote-" + i}>{quote.map((item, n) => <p key={n}>{renderInlineMarkdown(item, "quote-" + i + "-" + n)}</p>)}</blockquote>);
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && (/^\s*[-*+]\s+/.test(lines[i]) || /^\s*\d+[.)]\s+/.test(lines[i]))) items.push(lines[i++].replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/, ""));
      const List = ordered ? "ol" : "ul";
      blocks.push(<List key={"list-" + i}>{items.map((item, n) => <li key={n}>{renderInlineMarkdown(item, "list-" + i + "-" + n)}</li>)}</List>);
      continue;
    }
    const paragraph = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|\x60\x60\x60|---+|\*\*\*|___|\s*>|\s*[-*+]\s+|\s*\d+[.)]\s+|\*\*[^*]+\*\*)/.test(lines[i].trim()) && !(lines[i].trim().startsWith("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1]))) paragraph.push(lines[i++].trim());
    blocks.push(<p key={"p-" + i}>{renderInlineMarkdown(paragraph.join(" "), "p-" + i)}</p>);
  }
  return <div className="answer-markdown">{blocks}</div>;
}

function getProjectTurns(project: ResearchProject): ResearchTurn[] {
  if (Array.isArray(project.turns)) return project.turns;
  return (project.questions || []).map((question, index) => ({
    id: `${project.id}-${index}`,
    question,
    answer: index === (project.questions || []).length - 1 ? (project.answer || "") : "",
    model: project.model || "",
    provider: "",
  }));
}
type ProviderKey = { id: string; value: string };

const DEFAULT_USER_MEMORY = [
  "USER PROFILE — AXES AI",
  "Name: Vincent.",
  "Current life: Class 11 student at DAV School; CTO of Tech Symphony.",
  "Skills: HTML5 and CSS3 (advanced); JavaScript (mid-to-advanced); Python (intermediate); Discord community management.",
  "Projects: QuantumByte (future-tech ecosystem); EonOS (AI-powered OS concept); Nova (AI chat layer); Roster-AI (reliability and task-management framework); AXES AI (AI research workspace).",
  "Aspirations: Build QuantumByte into a successful technology company; freelance front-end work for cash flow; scale AI and software products globally.",
  "Interests: AI, system design, open-source, Discord growth, martial arts inspired by Bruce Lee, grip and forearm training, and cars (Grand Vitara Delta CNG).",
  "People and roles: Brother Shubham (development and marketing); friend Anant (future CMO vision); friend Shiven (collaborator and Tech Symphony CEO).",
  "Communication preferences: Casual, direct, friendly tone; modern branding; prefers Google sign-in or email plus OTP; likes ambitious, non-generic startup ideas.",
  "Guidance for AXES: Treat these as user-provided background, not immutable facts. Use relevant details naturally when helping with school, coding, product design, startup planning, and research. Do not force irrelevant personal details into answers. If Vincent corrects or updates something, prefer the latest information."
].join("\n");
type ModelOption = { provider: string; providerId: string; model: string; mark: string; tone: string; keyId?: string };

function readProviderKeys(providerId: string): ProviderKey[] {
  try {
    const stored = window.localStorage.getItem("axes:provider:" + providerId + ":api-keys");
    if (stored) return JSON.parse(stored) as ProviderKey[];
    const legacy = window.localStorage.getItem("axes:provider:" + providerId + ":api-key");
    return legacy ? [{ id: "legacy", value: legacy }] : [];
  } catch { return []; }
}

const providers = [
  { id: "openai", name: "OpenAI", mark: "◉", tone: "openai" },
  { id: "gemini", name: "Google Gemini", mark: "✦", tone: "gemini" },
  { id: "anthropic", name: "Anthropic Claude", mark: "✳", tone: "anthropic" },
  { id: "groq", name: "Groq", mark: "ϟ", tone: "groq" },
  { id: "deepseek", name: "DeepSeek", mark: "◈", tone: "deepseek" },
  { id: "openrouter", name: "OpenRouter", mark: "⌘", tone: "openrouter" },
  { id: "meshapi", name: "MeshAPI", mark: "✳", tone: "mesh" },
] as const;
const defaultModels: ModelOption[] = [{ provider: "OpenAI", providerId: "openai", model: "gpt-4o-mini", mark: "◉", tone: "openai" }];

function isChatModel(model: string): boolean {
  return !/(audio|speech|tts|whisper|embedding|embed-|rerank|moderation|image|video|transcri|orpheus|prompt-guard|safeguard)/i.test(model);
}

function chooseResearchModel(options: ModelOption[]): ModelOption | undefined {
  const compatible = options.filter((option) => isChatModel(option.model));
  const preferred = /chat|instruct|gpt|gemini|claude|llama|qwen|deepseek|mistral|command-r/i;
  return compatible.find((option) => preferred.test(option.model)) || compatible[0];
}

const navItems = [
  { label: "New chat", icon: Plus },
  { label: "Discover", icon: Search },
  { label: "Chat history", icon: Library },
  { label: "Model lab", icon: FileText },
];



function Brand() {
  return <div className="axes-brand">
    <span className="axes-symbol"><Atom size={22}/><i/></span>
    <span>axes<span className="brand-ai">.ai</span></span>
  </div>;
}

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modelOpen, setModelOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[]>(defaultModels);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(defaultModels[0]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState("");
  const [prompt, setPrompt] = useState("");
  const [activeNav, setActiveNav] = useState("New chat");
  const [messages, setMessages] = useState<string[]>([]);
  const [turns, setTurns] = useState<ResearchTurn[]>([]);
  const [researching, setResearching] = useState(false);
  const [researchMode, setResearchMode] = useState(false);
  const [personaMode, setPersonaMode] = useState("teacher");
  const [chatModeMenuOpen, setChatModeMenuOpen] = useState(false);
  const [apiProvider, setApiProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [apiKeys, setApiKeys] = useState<ProviderKey[]>([]);
  const [apiChain, setApiChain] = useState<{ providerId: string; keyId: string }[]>([]);
  const [apiChainReady, setApiChainReady] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [researchAnswer, setResearchAnswer] = useState("");
  const [researchError, setResearchError] = useState("");
  const [showApiFailureDialog, setShowApiFailureDialog] = useState(false);
  const [apiFailureDetails, setApiFailureDetails] = useState<string[]>([]);
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectsReady, setProjectsReady] = useState(false);
  const [pinnedProjectIds, setPinnedProjectIds] = useState<string[]>([]);
  const [projectMenuId, setProjectMenuId] = useState<string | null>(null);
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [editingTurnId, setEditingTurnId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [memoryNotes, setMemoryNotes] = useState("");
  const chatThreadRef = useRef<HTMLDivElement>(null);
  const latestTurnRef = useRef<HTMLDivElement>(null);
  const titleMigrationRef = useRef<Set<string>>(new Set());

  const activeProject = projects.find((project) => project.id === currentProjectId);
  const activePersonaMode = activeProject?.personaMode || personaMode;
  const activeResearchMode = activeProject?.researchMode ?? researchMode;

  const latestTurnId = turns.length ? turns[turns.length - 1].id : undefined;

  useEffect(() => {
    if (!turns.length) return;
    const thread = chatThreadRef.current;
    const latestTurn = latestTurnRef.current;
    if (!thread || !latestTurn) return;
    const targetTop = latestTurn.offsetTop - thread.offsetTop + thread.scrollTop;
    thread.scrollTo({ top: Math.max(0, targetTop - 12), behavior: "smooth" });
  }, [turns.length, latestTurnId]);

  useEffect(() => {
    try { const savedPins = window.localStorage.getItem("axes:pinned-projects"); if (savedPins) setPinnedProjectIds(JSON.parse(savedPins)); } catch { setPinnedProjectIds([]); }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("axes:pinned-projects", JSON.stringify(pinnedProjectIds));
  }, [pinnedProjectIds]);

  useEffect(() => {
    // Restore chats and migrate API credentials/chain from the older tab-only storage.
    try {
      setMemoryEnabled(window.localStorage.getItem("axes:memory-enabled") !== "false");
      setResearchMode(window.localStorage.getItem("axes:research-mode") === "true");
      const savedPersona = window.localStorage.getItem("axes:persona");
      setPersonaMode(savedPersona && ["bro","professor","god","teacher","exam-coach","researcher","coding-mentor","socratic"].includes(savedPersona) ? savedPersona : "teacher");
      const savedMemoryNotes = window.localStorage.getItem("axes:memory-notes");
      setMemoryNotes(savedMemoryNotes === null ? DEFAULT_USER_MEMORY : savedMemoryNotes);
      const savedProjects = window.localStorage.getItem("axes:research-projects");
      const restoredProjects = savedProjects ? JSON.parse(savedProjects) as ResearchProject[] : [];
      // Upgrade legacy titles that simply copied the first message. Preserve titles the user has already edited.
      const migratedProjects = restoredProjects.map((project) => {
        const firstMessage = getProjectTurns(project)[0]?.question?.trim() || "";
        const savedTitle = (project.title || "").trim();
        return firstMessage && savedTitle.toLowerCase() === firstMessage.toLowerCase()
          ? { ...project, title: makeConversationTitle(firstMessage) }
          : project;
      });
      setProjects(migratedProjects);
      if (migratedProjects.length) {
        const latest = migratedProjects[0];
        setCurrentProjectId(latest.id);
        setMessages(latest.questions || []);
        setTurns(getProjectTurns(latest));
        setResearchAnswer(latest.answer || "");
      }
      for (const provider of providers) {
        const persistentKey = "axes:provider:" + provider.id + ":api-keys";
        if (!window.localStorage.getItem(persistentKey)) {
          const sessionKeys = window.sessionStorage.getItem(persistentKey);
          if (sessionKeys) window.localStorage.setItem(persistentKey, sessionKeys);
          else {
            const legacy = window.sessionStorage.getItem("axes:provider:" + provider.id + ":api-key");
            if (legacy) window.localStorage.setItem(persistentKey, JSON.stringify([{ id: "legacy", value: legacy }]));
          }
        }
        window.sessionStorage.removeItem(persistentKey);
        window.sessionStorage.removeItem("axes:provider:" + provider.id + ":api-key");
      }
      const savedChain = window.localStorage.getItem("axes:api-chain");
      if (!savedChain) {
        const oldChain = window.sessionStorage.getItem("axes:api-chain");
        if (oldChain) window.localStorage.setItem("axes:api-chain", oldChain);
      }
      window.sessionStorage.removeItem("axes:api-chain");
    } catch {
      // Keep the workspace usable if browser storage contains invalid data.
    }
    setProjectsReady(true);
  }, []);

  useEffect(() => {
    if (projectsReady) window.localStorage.setItem("axes:research-projects", JSON.stringify(projects));
  }, [projects, projectsReady]);

  useEffect(() => {
    if (!projectsReady || !models.length || !projects.length) return;
    let cancelled = false;
    async function upgradeSavedTitles() {
      for (const project of projects) {
        if (titleMigrationRef.current.has(project.id)) continue;
        const firstMessage = getProjectTurns(project)[0]?.question?.trim() || "";
        const currentTitle = (project.title || "").trim();
        if (!firstMessage || (currentTitle.toLowerCase() !== firstMessage.toLowerCase() && currentTitle !== makeConversationTitle(firstMessage))) continue;
        titleMigrationRef.current.add(project.id);
        const candidate = models.find((item) => readProviderKeys(item.providerId).some((key) => key.id === item.keyId));
        const key = candidate && readProviderKeys(candidate.providerId).find((item) => item.id === candidate.keyId)?.value;
        if (!candidate || !key) continue;
        try {
          const response = await fetch("/api/research/title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ provider: candidate.providerId, model: candidate.model, apiKey: key, message: firstMessage }),
          });
          const data = await response.json().catch(() => ({}));
          if (!cancelled && response.ok && typeof data.title === "string" && data.title.trim()) {
            const title = data.title.trim();
            setProjects((old) => old.map((item) => item.id === project.id ? { ...item, title } : item));
          }
        } catch { /* A saved chat remains usable if title migration fails. */ }
      }
    }
    void upgradeSavedTitles();
    return () => { cancelled = true; };
  }, [projectsReady, models, projects]);

  useEffect(() => {
    if (!projectsReady) return;
    window.localStorage.setItem("axes:research-mode", String(researchMode));
  }, [researchMode, projectsReady]);

  useEffect(() => {
    if (!projectsReady) return;
    window.localStorage.setItem("axes:persona", personaMode);
  }, [personaMode, projectsReady]);

  useEffect(() => {
    if (!projectsReady) return;
    window.localStorage.setItem("axes:memory-enabled", String(memoryEnabled));
    window.localStorage.setItem("axes:memory-notes", memoryNotes);
  }, [memoryEnabled, memoryNotes, projectsReady]);

  useEffect(() => {
    try {
      const storedChain = window.localStorage.getItem("axes:api-chain");
      if (storedChain) {
        const parsed = JSON.parse(storedChain) as { providerId: string; keyId: string }[];
        setApiChain(parsed.slice(0, 6));
      } else {
        const initial: { providerId: string; keyId: string }[] = [];
        for (const provider of providers) {
          for (const key of readProviderKeys(provider.id)) {
            if (initial.length < 6) initial.push({ providerId: provider.id, keyId: key.id });
          }
        }
        setApiChain(initial);
        window.localStorage.setItem("axes:api-chain", JSON.stringify(initial));
      }
    } catch { setApiChain([]); }
    setApiChainReady(true);
  }, []);

  useEffect(() => {
    if (apiChainReady) window.localStorage.setItem("axes:api-chain", JSON.stringify(apiChain.slice(0, 6)));
  }, [apiChain, apiChainReady]);

  function toggleChatResearchMode() {
    const nextMode = !activeResearchMode;
    if (currentProjectId) {
      setProjects((old) => old.map((project) => project.id === currentProjectId ? { ...project, researchMode: nextMode, updatedAt: Date.now() } : project));
    } else {
      setResearchMode(nextMode);
      window.localStorage.setItem("axes:research-mode", String(nextMode));
    }
  }

  function selectChatPersonaMode(mode: string) {
    if (currentProjectId) {
      setProjects((old) => old.map((project) => project.id === currentProjectId ? { ...project, personaMode: mode, updatedAt: Date.now() } : project));
    } else {
      setPersonaMode(mode);
      window.localStorage.setItem("axes:persona", mode);
    }
    setChatModeMenuOpen(false);
  }

  function branchConversationFromTurn(turnId: string) {
    const sourceProject = projects.find((project) => project.id === currentProjectId);
    const sourceTurns = turns.length ? turns : (sourceProject ? getProjectTurns(sourceProject) : []);
    const turnIndex = sourceTurns.findIndex((turn) => turn.id === turnId);
    if (turnIndex < 0) return;
    const branchTurns = sourceTurns.slice(0, turnIndex + 1).map((turn) => ({ ...turn }));
    const sourceQuestion = branchTurns[branchTurns.length - 1]?.question || "conversation";
    const branchId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : "branch-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const branchTitle = ("Branch: " + sourceQuestion.replace(/\\s+/g, " ").trim()).slice(0, 48);
    const branch: ResearchProject = {
      id: branchId,
      title: branchTitle,
      questions: branchTurns.map((turn) => turn.question),
      answer: branchTurns[branchTurns.length - 1]?.answer || "",
      model: branchTurns[branchTurns.length - 1]?.model || selectedModel.model,
      updatedAt: Date.now(),
      turns: branchTurns,
      personaMode: activePersonaMode,
      researchMode: activeResearchMode,
    };
    setProjects((old) => [branch, ...old]);
    setCurrentProjectId(branchId);
    setMessages(branch.questions);
    setTurns(branchTurns);
    setResearchAnswer(branch.answer);
    setResearchError("");
    setPrompt("");
    setActiveNav("Research project");
  }

  function exportCurrentChat(format: "md" | "txt") {
    const project = projects.find((item) => item.id === currentProjectId);
    const title = (project?.title || "AXES AI conversation").replace(/[\\/:*?"<>|]+/g, "-").trim() || "AXES AI conversation";
    const conversationTurns = turns.length ? turns : (project ? getProjectTurns(project) : []);
    if (!conversationTurns.length) return;
    const content = format === "md"
      ? `# ${title}\n\n${conversationTurns.map((turn) => `## You\n\n${turn.question}\n\n## AXES AI${turn.model ? ` · ${turn.model}` : ""}\n\n${turn.answer || turn.error || "No response recorded."}`).join("\n\n---\n\n")}\n`
      : `${title}\n${"=".repeat(title.length)}\n\n${conversationTurns.map((turn) => `YOU\n${turn.question}\n\nAXES AI${turn.model ? ` (${turn.model})` : ""}\n${turn.answer || turn.error || "No response recorded."}`).join("\n\n----------------------------------------\n\n")}\n`;
    const blob = new Blob([content], { type: format === "md" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  }

  function saveProjectTitle(projectId: string) {
    const title = renameDraft.replace(/\s+/g, " ").trim();
    if (title) setProjects((old) => old.map((item) => item.id === projectId ? { ...item, title } : item));
    setRenamingProjectId(null);
    setRenameDraft("");
  }

  function addToChain(providerId: string, keyId: string) {
    setApiChain((old) => old.length >= 6 || old.some((item) => item.providerId === providerId && item.keyId === keyId)
      ? old
      : [...old, { providerId, keyId }]);
  }

  function moveChainItem(index: number, direction: -1 | 1) {
    setApiChain((old) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= old.length) return old;
      const next = [...old];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function removeFromChain(providerId: string, keyId: string) {
    setApiChain((old) => old.filter((item) => !(item.providerId === providerId && item.keyId === keyId)));
  }

  useEffect(() => {
    let cancelled = false;
    async function loadConnectedProviders() {
      setModelsLoading(true);
      const loaded: ModelOption[] = [];
      const connected: string[] = [];
      for (const providerMeta of providers) {
        for (const savedKey of readProviderKeys(providerMeta.id)) {
          try {
            const response = await fetch("/api/models", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ provider: providerMeta.id, apiKey: savedKey.value }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !Array.isArray(data.models)) continue;
            const available = data.models.filter((model: unknown): model is string => typeof model === "string" && model.trim().length > 0 && isChatModel(model));
            if (!available.length) continue;
            if (!connected.includes(providerMeta.id)) connected.push(providerMeta.id);
            loaded.push(...available.map((model: string) => ({ provider: providerMeta.name, providerId: providerMeta.id, model, mark: providerMeta.mark, tone: providerMeta.tone, keyId: savedKey.id })));
          } catch { /* Continue trying other saved keys. */ }
        }
      }
      if (!cancelled) {
        setApiKeys(readProviderKeys(apiProvider));
        setModels(loaded);
        setConnectedProviders(connected);
        if (loaded.length) {
          const preferredModel = chooseResearchModel(loaded);
          if (preferredModel) setSelectedModel(preferredModel);
        }
        setApiKeySaved(connected.includes(apiProvider));
        setModelsLoading(false);
      }
    }
    loadConnectedProviders();
    return () => { cancelled = true; };
  }, [apiProvider]);

  async function saveApiKey() {
    const key = apiKey.trim();
    if (!key || modelsLoading) return;
    setModelsLoading(true);
    setModelsError("");
    setApiKeySaved(false);
    try {
      const response = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: apiProvider, apiKey: key }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not load models for this provider.");
      const available = Array.isArray(data.models) ? data.models.filter((model: unknown): model is string => typeof model === "string" && model.trim().length > 0 && isChatModel(model)) : [];
      if (!available.length) throw new Error("This provider returned no compatible models.");
      const providerMeta = providers.find((p) => p.id === apiProvider) || providers[0];
      const keyId = crypto.randomUUID();
      const nextKeys = [...readProviderKeys(apiProvider).filter((item) => item.value !== key), { id: keyId, value: key }];
      window.localStorage.setItem("axes:provider:" + apiProvider + ":api-keys", JSON.stringify(nextKeys));
      window.localStorage.removeItem("axes:provider:" + apiProvider + ":api-key");
      setApiKeys(nextKeys);
      const nextModels = available.map((model: string) => ({ provider: providerMeta.name, providerId: apiProvider, model, mark: providerMeta.mark, tone: providerMeta.tone, keyId }));
      setModels((old) => [...old, ...nextModels]);
      addToChain(apiProvider, keyId);
      setConnectedProviders((old) => old.includes(apiProvider) ? old : [...old, apiProvider]);
      const preferredModel = chooseResearchModel(nextModels);
      if (preferredModel) setSelectedModel(preferredModel);
      setApiKey("");
      setApiKeySaved(true);
      setResearchError("");
    } catch (error) {
      setModelsError(error instanceof Error ? error.message : "Could not connect to this provider.");
    } finally { setModelsLoading(false); }
  }

  function removeApiKey(keyId: string) {
    const nextKeys = readProviderKeys(apiProvider).filter((item) => item.id !== keyId);
    window.localStorage.setItem("axes:provider:" + apiProvider + ":api-keys", JSON.stringify(nextKeys));
    window.localStorage.removeItem("axes:provider:" + apiProvider + ":api-key");
    setApiKeys(nextKeys);
    setModels((old) => old.filter((item) => !(item.providerId === apiProvider && item.keyId === keyId)));
    removeFromChain(apiProvider, keyId);
    if (!nextKeys.length) setConnectedProviders((old) => old.filter((id) => id !== apiProvider));
  }

  async function startResearch(value = prompt, options?: { replaceFromTurnId?: string }) {
    const question = value.trim();
    if (!question || researching) return;
    setShowApiFailureDialog(false);
    setApiFailureDetails([]);
    const connectedModels = models.filter((item) => readProviderKeys(item.providerId).some((key) => key.id === item.keyId));
    const candidates: ModelOption[] = [];
    const addCandidate = (candidate: ModelOption) => {
      if (!candidates.some((item) => item.providerId === candidate.providerId && item.keyId === candidate.keyId && item.model === candidate.model)) candidates.push(candidate);
    };
    for (const chainItem of apiChain) {
      const keyModels = connectedModels.filter((item) => item.providerId === chainItem.providerId && item.keyId === chainItem.keyId);
      // One chat-capable model per key. Fail over between keys, not through unrelated
      // audio, moderation, or other non-chat endpoints returned by provider model catalogs.
      const best = chooseResearchModel(keyModels);
      if (best) addCandidate(best);
    }
    if (!candidates.length) {
      setActiveNav("Settings");
      setResearchError("Add at least one saved API key to your API Chain in Settings before sending a message.");
      return;
    }

    // Honour the model selected in the chat toolbar when it belongs to the active
    // API chain. Keep the remaining chain order intact for automatic failover.
    const preferredIndex = candidates.findIndex((item) =>
      item.providerId === selectedModel.providerId &&
      item.keyId === selectedModel.keyId &&
      item.model === selectedModel.model
    );
    if (preferredIndex > 0) {
      const [preferred] = candidates.splice(preferredIndex, 1);
      candidates.unshift(preferred);
    }

    const first = candidates[0];
    const projectId = currentProjectId ?? crypto.randomUUID();
    const existingProject = projects.find((item) => item.id === projectId);
    const now = Date.now();
    const newProject: ResearchProject = {
      id: projectId,
      title: makeConversationTitle(question),
      questions: [question],
      answer: "",
      model: first.model,
      turns: [],
      personaMode: existingProject?.personaMode || personaMode,
      researchMode: existingProject?.researchMode ?? researchMode,
      updatedAt: now,
    };
    setSelectedModel(first);
    setCurrentProjectId(projectId);
    const pendingTurn: ResearchTurn = { id: crypto.randomUUID(), question, answer: "", model: first.model, provider: first.provider };
    const allExistingTurns = existingProject ? getProjectTurns(existingProject) : [];
    const replaceIndex = options?.replaceFromTurnId ? allExistingTurns.findIndex((turn) => turn.id === options.replaceFromTurnId) : -1;
    const previousTurns = replaceIndex >= 0 ? allExistingTurns.slice(0, replaceIndex) : allExistingTurns;
    const currentChatHistory = previousTurns.slice(-8).flatMap((turn) => [
      { role: "user" as const, content: turn.question.slice(0, 1200) },
      ...(turn.answer ? [{ role: "assistant" as const, content: turn.answer.slice(0, 1600) }] : []),
    ]);
    const previousChatMemory = memoryEnabled ? projects
      .filter((project) => project.id !== projectId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .flatMap((project) => getProjectTurns(project)
        .filter((turn) => turn.question.trim() && turn.answer.trim())
        .slice(-4)
        .map((turn) => "Previous chat: " + project.title + "\\nUser: " + turn.question.slice(0, 500) + "\\nAXES AI: " + turn.answer.slice(0, 700)))
      .slice(0, 12)
      .join("\\n\\n")
      .slice(0, 6000) : "";
    setTurns([...previousTurns, pendingTurn]);
    setProjects((old) => existingProject
      ? old.map((item) => item.id === projectId ? { ...item, questions: [...previousTurns.map((turn) => turn.question), question], turns: [...previousTurns, pendingTurn], updatedAt: now } : item)
      : [{ ...newProject, turns: [pendingTurn] }, ...old]);
    setEditingTurnId(null);
    setEditDraft("");
    setPrompt("");
    setResearchAnswer("");
    setResearchError("");
    setMessages([...previousTurns.map((turn) => turn.question), question]);
    setResearching(true);

    let lastError = "No connected provider could answer this message.";
    const failedAttempts: string[] = [];
    try {
      for (const candidate of candidates) {
        const key = readProviderKeys(candidate.providerId).find((item) => item.id === candidate.keyId)?.value;
        if (!key) continue;
        try {
          const response = await fetch("/api/research", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ provider: candidate.providerId, model: candidate.model, apiKey: key, question, history: currentChatHistory, previousChats: previousChatMemory, memoryNotes: memoryEnabled ? memoryNotes.slice(0, 3000) : "", researchMode: existingProject?.researchMode ?? researchMode, personaMode: existingProject?.personaMode || personaMode }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || `${candidate.provider} request failed.`);
          if (typeof data.answer !== "string" || !data.answer.trim()) throw new Error(`${candidate.provider} returned an empty response.`);
          setSelectedModel(candidate);
          // Reveal the completed response in short readable chunks instead of one visual wall.
          // The provider response is still received as a whole; this is a paced display effect.
          const answer = data.answer as string;
          const chunkSize = 32;
          for (let end = chunkSize; end < answer.length + chunkSize; end += chunkSize) {
            const visibleAnswer = answer.slice(0, Math.min(end, answer.length));
            setResearchAnswer(visibleAnswer);
            setTurns((old) => old.map((turn) => turn.id === pendingTurn.id ? { ...turn, answer: visibleAnswer, model: candidate.model, provider: candidate.provider, error: undefined } : turn));
            setProjects((old) => old.map((item) => item.id === projectId
              ? { ...item, answer: visibleAnswer, model: candidate.model, turns: getProjectTurns(item).map((turn) => turn.id === pendingTurn.id ? { ...turn, answer: visibleAnswer, model: candidate.model, provider: candidate.provider, error: undefined } : turn), updatedAt: Date.now() }
              : item));
            if (end < answer.length) await new Promise((resolve) => window.setTimeout(resolve, 18));
          }
          // Generate a semantic title from the first message using the same provider/model.
          // Existing chats are only retitled when this is their first turn.
          if (previousTurns.length === 0) {
            try {
              const titleResponse = await fetch("/api/research/title", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider: candidate.providerId, model: candidate.model, apiKey: key, message: question }),
              });
              const titleData = await titleResponse.json().catch(() => ({}));
              if (titleResponse.ok && typeof titleData.title === "string" && titleData.title.trim()) {
                const generatedTitle = titleData.title.trim();
                setProjects((old) => old.map((item) => item.id === projectId
                  ? { ...item, title: generatedTitle, updatedAt: Date.now() }
                  : item));
              }
            } catch {
              // A title failure must never interrupt a successful answer.
            }
          }
          return;
        } catch (error) {
          lastError = error instanceof Error ? error.message : `${candidate.provider} request failed.`;
          const providerKeys = readProviderKeys(candidate.providerId);
          const keyNumber = providerKeys.findIndex((item) => item.id === candidate.keyId) + 1;
          failedAttempts.push(`${candidate.provider} · Key ${keyNumber || "?"} · ${candidate.model}: ${lastError}`);
        }
      }
      setApiFailureDetails(failedAttempts);
      setShowApiFailureDialog(true);
      throw new Error(lastError);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not get a response from connected providers.";
      setResearchError(message);
      setTurns((old) => old.map((turn) => turn.id === pendingTurn.id ? { ...turn, error: message } : turn));
      setProjects((old) => old.map((item) => item.id === projectId ? { ...item, turns: getProjectTurns(item).map((turn) => turn.id === pendingTurn.id ? { ...turn, error: message } : turn), updatedAt: Date.now() } : item));
    } finally {
      setResearching(false);
    }
  }

  const visibleProjects = [...projects]
    .filter((project) => {
      const query = chatSearch.trim().toLowerCase();
      if (!query) return true;
      const searchable = [project.title, ...getProjectTurns(project).flatMap((turn) => [turn.question, turn.answer])].join(" ").toLowerCase();
      return searchable.includes(query);
    })
    .sort((a, b) => Number(pinnedProjectIds.includes(b.id)) - Number(pinnedProjectIds.includes(a.id)) || b.updatedAt - a.updatedAt);

  return <main className="axes-app">
    {sidebarOpen && <aside className="axes-sidebar">
      <div className="sidebar-top">
        <Brand />
        <button className="icon-button sidebar-collapse" aria-label="Collapse sidebar" onClick={() => setSidebarOpen(false)}><PanelLeftClose size={17}/></button>
      </div>
      <button className="new-research" onClick={() => { setActiveNav("New chat"); setMessages([]); setTurns([]); setResearchAnswer(""); setResearchError(""); setCurrentProjectId(null); }}><Plus size={16}/> <span>New chat</span><span className="shortcut">⌘ K</span></button>
      {projects.length > 0 && <><div className="sidebar-section-label recent-label"><span>YOUR CHATS</span><button type="button" aria-label="New chat" onClick={() => { setActiveNav("New chat"); setMessages([]); setTurns([]); setResearchAnswer(""); setResearchError(""); setCurrentProjectId(null); }}><Plus size={14}/></button></div><div className="chat-history-search"><Search size={14}/><input aria-label="Search chat history" placeholder="Search chats and messages" value={chatSearch} onChange={(event) => setChatSearch(event.target.value)}/>{chatSearch && <button type="button" aria-label="Clear search" onClick={() => setChatSearch("")}>×</button>}</div><nav className="recent-list">{visibleProjects.length ? visibleProjects.map((project) => <div key={project.id} className={"recent-chat-row" + (currentProjectId === project.id ? " selected" : "")}>{renamingProjectId === project.id ? <input autoFocus className="recent-chat-rename-input" aria-label="Rename chat" value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveProjectTitle(project.id); if (event.key === "Escape") { setRenamingProjectId(null); setRenameDraft(""); } }} /> : <button type="button" className="recent-chat-open" title={project.title} onClick={() => { setCurrentProjectId(project.id); setMessages(project.questions); setTurns(getProjectTurns(project)); setResearchAnswer(project.answer); setResearchError(""); setActiveNav("Research project"); setProjectMenuId(null); }}><span>{project.title}</span></button>}<div className="recent-chat-actions"><button type="button" aria-label={pinnedProjectIds.includes(project.id) ? "Unpin chat" : "Pin chat"} title={pinnedProjectIds.includes(project.id) ? "Unpin" : "Pin"} onClick={() => setPinnedProjectIds((old) => old.includes(project.id) ? old.filter((id) => id !== project.id) : [...old, project.id])}><Pin size={14}/></button><button type="button" aria-label="Chat options" title="Chat options" onClick={() => setProjectMenuId((old) => old === project.id ? null : project.id)}><MoreHorizontal size={16}/></button></div>{projectMenuId === project.id && <div className="recent-chat-menu"><button type="button" onClick={() => { setRenamingProjectId(project.id); setRenameDraft(project.title); setProjectMenuId(null); }}>Rename chat</button><button type="button" onClick={() => { setPinnedProjectIds((old) => old.includes(project.id) ? old.filter((id) => id !== project.id) : [...old, project.id]); setProjectMenuId(null); }}>{pinnedProjectIds.includes(project.id) ? "Unpin chat" : "Pin chat"}</button><button type="button" className="danger" onClick={() => { setProjects((old) => old.filter((item) => item.id !== project.id)); if (currentProjectId === project.id) { setCurrentProjectId(null); setMessages([]); setTurns([]); setResearchAnswer(""); } setProjectMenuId(null); }}>Delete chat</button></div>}</div>) : <div className="chat-history-empty">{chatSearch.trim() ? "No matching chats" : "No saved chats"}</div>}</nav></>}
      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="sidebar-nav">
        {navItems.map(({label,icon:Icon}) => <button key={label} className={activeNav === label ? "nav-item active" : "nav-item"} onClick={() => setActiveNav(label)}><Icon size={16}/><span>{label}</span></button>)}
      </nav>
      <div className="sidebar-bottom">
        <button className="sidebar-bottom-item" onClick={() => setActiveNav("Models")}><BrainCircuit size={16}/><span>Models</span><span className="tiny-count">{models.length}</span></button>
        <button className="sidebar-bottom-item" onClick={() => setActiveNav("Settings")}><Settings2 size={16}/><span>Settings</span></button>
        <div className="profile-row"><div className="profile-avatar">V</div><div><b>Research workspace</b><small>Personal account</small></div><MoreHorizontal size={16}/></div>
      </div>
    </aside>}
    <section className="axes-main">
      <div className="research-scroll">
        <div className="research-content">
          {activeNav === "Settings" ? <div className="settings-page">
            <nav className="settings-nav" aria-label="Settings navigation">
              <div className="settings-nav-heading"><span className="settings-kicker">PREFERENCES</span><b>Settings</b></div>
              <button type="button" className="settings-close-button" aria-label="Close settings" onClick={() => setActiveNav("New chat")}><X size={17}/></button>
              <a href="#settings-overview"><SlidersHorizontal size={15}/> Overview</a>
              <a href="#settings-providers"><BrainCircuit size={15}/> AI connections</a>
              <a href="#settings-routing"><Orbit size={15}/> API chain</a>
              <a href="#settings-api-keys"><KeyRound size={15}/> API keys</a>
              <a href="#settings-memory"><BrainCircuit size={15}/> Memory</a>
              <a href="#settings-personality"><Sparkles size={15}/> Personalization</a>
              <a href="#settings-safety"><ShieldCheck size={15}/> Safety</a>
              <a href="#settings-terms"><FileText size={15}/> Terms & privacy</a>
            </nav>
            <div className="settings-main-content">
            <div className="settings-heading settings-hero" id="settings-overview"><span className="settings-kicker">AXES CONTROL CENTER</span><h1>Settings</h1><p>Manage AI providers, routing, memory and local workspace preferences.</p><div className="settings-overview-grid"><div className="settings-overview-card"><span>Connected providers</span><b>{connectedProviders.length}</b><small>Providers with saved keys</small></div><div className="settings-overview-card"><span>Saved API keys</span><b>{providers.reduce((total, provider) => total + readProviderKeys(provider.id).length, 0)}</b><small>Stored in this browser</small></div><div className="settings-overview-card"><span>Active chain</span><b>{apiChain.length}<i>/6</i></b><small>Ordered fallback keys</small></div><div className="settings-overview-card"><span>AI memory</span><b className="settings-memory-status">{memoryEnabled ? "On" : "Off"}</b><small>Cross-chat context</small></div></div></div>
            <div className="settings-section-intro" id="settings-providers"><div><span className="settings-kicker">01 · PROVIDERS</span><h2>AI connections</h2><p>Choose a provider to add, validate or manage its API keys.</p></div><span className="settings-section-count">{providers.length} providers supported</span></div>
            <div className="provider-grid">
              {providers.map((provider) => <button type="button" key={provider.id} className={apiProvider === provider.id ? "provider-card selected" : "provider-card"} onClick={() => { setApiProvider(provider.id); setApiKey(""); setApiKeys(readProviderKeys(provider.id)); setApiKeySaved(readProviderKeys(provider.id).length > 0); setModelsError(""); }}>
                <span className={"provider-mark " + provider.tone}>{provider.mark}</span><span className="provider-card-copy"><b>{provider.name}</b><small>{connectedProviders.includes(provider.id) ? "API key connected · models ready" : "Select to add or manage a key"}</small></span><span className="provider-card-action">{connectedProviders.includes(provider.id) ? "Manage key" : "Add API key"} <Plus size={13}/></span>
              </button>)}
            </div>
            <section className="api-chain-card" id="settings-routing"><div className="settings-section-label"><span className="settings-kicker">02 · ROUTING</span><span>Automatic provider failover</span></div>
              <div className="api-chain-heading"><div><span className="settings-kicker">AUTOMATIC FAILOVER</span><h2>API Chain <span>{apiChain.length}/6</span></h2><p>AXES tries each key in this exact order and stops at the first successful answer.</p></div><span className="chain-status">{apiChain.length === 6 ? "Chain full" : "Up to 6 keys"}</span></div>
              {apiChain.length ? <ol className="api-chain-list">{apiChain.map((item, index) => {
                const providerMeta = providers.find((provider) => provider.id === item.providerId);
                const providerKeys = readProviderKeys(item.providerId);
                const keyIndex = providerKeys.findIndex((key) => key.id === item.keyId);
                const key = providerKeys[keyIndex];
                return <li className="api-chain-item" key={item.providerId + ":" + item.keyId}><span className="chain-number">{index + 1}</span><span className={"provider-mark " + (providerMeta?.tone || "")}>{providerMeta?.mark || "?"}</span><span className="chain-item-copy"><b>{providerMeta?.name || item.providerId} {keyIndex >= 0 ? "Key " + (keyIndex + 1) : "Key"}</b><small>{key ? "••••••••" + key.value.slice(-4) : "Key unavailable"}</small></span><div className="chain-item-actions"><button type="button" aria-label="Move up" title="Move up" disabled={index === 0} onClick={() => moveChainItem(index, -1)}>↑</button><button type="button" aria-label="Move down" title="Move down" disabled={index === apiChain.length - 1} onClick={() => moveChainItem(index, 1)}>↓</button><button type="button" aria-label="Remove from chain" title="Remove from chain" onClick={() => removeFromChain(item.providerId, item.keyId)}>×</button></div></li>;
              })}</ol> : <p className="chain-empty">Your chain is empty. Add saved API keys below to enable automatic fallback.</p>}
              <div className="chain-add-area"><b>Add saved keys to chain</b><div className="chain-add-list">{providers.flatMap((provider) => readProviderKeys(provider.id).map((key, index) => ({ provider, key, index }))).filter(({ provider, key }) => !apiChain.some((item) => item.providerId === provider.id && item.keyId === key.id)).map(({ provider, key, index }) => <button type="button" key={provider.id + ":" + key.id} disabled={apiChain.length >= 6} onClick={() => addToChain(provider.id, key.id)}><Plus size={12}/>{provider.name} {index + 1}</button>)}</div>{apiChain.length >= 6 && <small className="chain-limit-note">Maximum chain length reached. Remove a key to add another.</small>}</div>
            </section>
            <section className="settings-card" id="settings-api-keys">
              <div className="settings-card-title"><span className="settings-card-icon"><KeyRound size={17}/></span><div><h2>{providers.find((p) => p.id === apiProvider)?.name || "Provider"} API key</h2><p>Enter your key to load the available models for this provider.</p></div></div>
              <div className="saved-api-keys"><div className="settings-label">Saved keys ({apiKeys.length})</div>{apiKeys.map((savedKey, index) => <div className="saved-api-key-row" key={savedKey.id}><span><b>Key {index + 1}</b><small>••••••••{savedKey.value.slice(-4)}</small></span><button type="button" className="settings-remove" onClick={() => removeApiKey(savedKey.id)}><Trash2 size={13}/> Remove</button></div>)}</div>
              <label className="settings-label" htmlFor="provider-key">Add another API key</label><div className="api-key-field"><input id="provider-key" type={showApiKey ? "text" : "password"} value={apiKey} onChange={(e)=>{setApiKey(e.target.value);setApiKeySaved(false);}} placeholder={`Paste your ${providers.find((p)=>p.id===apiProvider)?.name || apiProvider} API key`} autoComplete="off"/><button type="button" aria-label={showApiKey ? "Hide API key" : "Show API key"} onClick={()=>setShowApiKey(!showApiKey)}>{showApiKey ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div>
              <div className="settings-security"><ShieldCheck size={15}/><span>Your key is stored in this browser on this device and used for model discovery and requests. Browser storage is not encrypted by AXES AI, so only save keys on a trusted device.</span></div>
              {modelsLoading && <p>Loading available models…</p>}{modelsError && <p className="research-error">{modelsError}</p>}{apiKeySaved && !modelsLoading && !modelsError && <p>{models.length} models loaded for {providers.find((p)=>p.id===apiProvider)?.name}.</p>}
              <div className="settings-actions"><button className="settings-save" disabled={!apiKey.trim() || modelsLoading} onClick={saveApiKey}>{modelsLoading ? "Connecting…" : "Add API key"}</button></div>
            </section>
            <section className="settings-card memory-settings-card" id="settings-memory"><div className="settings-section-label"><span className="settings-kicker">04 · PERSONALIZATION</span><span>Context across conversations</span></div>
              <div className="settings-card-title"><span className="settings-card-icon"><BrainCircuit size={17}/></span><div><h2>Persistent AI memory</h2><p>Let AXES AI use relevant details from your earlier chats in this browser.</p></div></div>
              <div className="memory-toggle-row"><div><b>{memoryEnabled ? "Memory is on" : "Memory is off"}</b><small>{memoryEnabled ? "Previous chats and your notes can inform new conversations." : "New conversations will not use previous-chat context."}</small></div><button type="button" className={memoryEnabled ? "memory-toggle active" : "memory-toggle"} role="switch" aria-checked={memoryEnabled} onClick={() => setMemoryEnabled((value) => !value)}><span/></button></div>
              <label className="settings-label" htmlFor="axes-memory-notes">Things AXES AI should remember</label>
              <textarea id="axes-memory-notes" className="memory-notes-input" value={memoryNotes} onChange={(event) => setMemoryNotes(event.target.value)} placeholder="Add preferences, ongoing projects, goals, or other context you want AXES AI to remember…" rows={5} disabled={!memoryEnabled}/>
              <div className="memory-footnote">Memory is stored locally in this browser alongside your saved chats. It is not synced between devices. Do not store passwords or API keys here.</div>
            </section>

            <section className="settings-card persona-settings-card" id="settings-personality">
              <div className="settings-section-label"><span className="settings-kicker">05 · PERSONALITY</span><span>Choose how AXES AI teaches</span></div>
              <div className="settings-card-title"><span className="settings-card-icon"><Sparkles size={17}/></span><div><h2>Assistant modes</h2><p>Change the explanation style. Every mode follows the same education and safety rules.</p></div></div>
              <div className="persona-mode-grid">
                {[
                  {id:"bro",name:"Bro Mode",tag:"Casual & friendly",desc:"Relaxed explanations, everyday examples and light humour.",icon:<Atom size={19}/>},
                  {id:"professor",name:"Professor Mode",tag:"Deep & academic",desc:"Precise terminology, theory, derivations and academic depth.",icon:<GraduationCap size={19}/>},
                  {id:"god",name:"God Mode",tag:"Advanced learner",desc:"Maximum depth, connected concepts and challenging insights — never a safety bypass.",icon:<Zap size={19}/>},
                  {id:"teacher",name:"Teacher Mode",tag:"Clear & supportive",desc:"Step-by-step lessons, examples and checks for understanding.",icon:<BookOpen size={19}/>},
                  {id:"exam-coach",name:"Exam Coach",tag:"Marks & practice",desc:"Exam-focused explanations, model answers and practice questions.",icon:<ClipboardCheck size={19}/>},
                  {id:"researcher",name:"Researcher Mode",tag:"Evidence first",desc:"Structured analysis, careful uncertainty and source-aware research.",icon:<Microscope size={19}/>},
                  {id:"coding-mentor",name:"Coding Mentor",tag:"Build & understand",desc:"Explain code, debug thoughtfully and teach good engineering habits.",icon:<Code2 size={19}/>},
                  {id:"socratic",name:"Socratic Tutor",tag:"Learn by thinking",desc:"Guiding questions and hints before revealing a full solution.",icon:<BrainCircuit size={19}/>}
                ].map((mode) => <button type="button" key={mode.id} className={personaMode===mode.id?"persona-mode-card selected":"persona-mode-card"} aria-pressed={personaMode===mode.id} onClick={()=>{window.localStorage.setItem("axes:persona",mode.id);setPersonaMode(mode.id);}}><span className="persona-mode-top"><span className="persona-mode-icon" aria-hidden="true">{mode.icon}</span><b>{mode.name}</b>{personaMode===mode.id&&<Check className="persona-mode-check" size={15}/>}</span><small>{mode.tag}</small><span>{mode.desc}</span></button>)}
              </div>
              <div className="persona-current-note">Default for new chats: <b>{personaMode === "bro" ? "Bro Mode" : personaMode === "professor" ? "Professor Mode" : personaMode === "god" ? "God Mode" : personaMode === "teacher" ? "Teacher Mode" : personaMode === "exam-coach" ? "Exam Coach" : personaMode === "researcher" ? "Researcher Mode" : personaMode === "coding-mentor" ? "Coding Mentor" : "Socratic Tutor"}</b> · This mode is sent with every new chat message. Switch it here and the chat updates immediately.</div>
            </section>
            <section className="settings-card education-policy-card" id="settings-safety">
              <div className="settings-section-label"><span className="settings-kicker">06 · TRUST & SAFETY</span><span>Education-first by design</span></div>
              <div className="settings-card-title"><span className="settings-card-icon"><ShieldCheck size={17}/></span><div><h2>Education & safety policy</h2><p>AXES AI is designed for learning, research, creativity and responsible building.</p></div></div>
              <div className="policy-rule-list">
                <div><b>Education-only purpose</b><span>School subjects, science, technology, research, writing, languages and constructive creativity are welcome.</span></div>
                <div><b>No mature or explicit content</b><span>Sexually explicit material, pornography, erotic roleplay and adult-content requests are not allowed.</span></div>
                <div><b>No harmful instructions</b><span>Requests that facilitate violence, weapons, self-harm, dangerous challenges, illegal activity or abuse are refused.</span></div>
                <div><b>Safe educational discussion</b><span>Age-appropriate health, biology, history, safety and current-events education can be discussed without graphic or instructional harmful detail.</span></div>
                <div><b>Respect & privacy</b><span>No harassment, hate, exploitation, doxxing or requests to expose private information. Never put passwords or API keys in memory notes.</span></div>
              </div>
              <div className="policy-footnote">Safety rules apply to every personality mode, including God Mode. No mode can disable or override them.</div>
            </section>
            <section className="settings-card terms-policy-card" id="settings-terms">
              <div className="settings-section-label"><span className="settings-kicker">07 · TERMS & POLICIES</span><span>Plain-language product rules</span></div>
              <div className="policy-document"><h3>Terms of Use</h3><p>By using AXES AI, you agree to use it for lawful, educational and constructive purposes. You must not request, create, share or use the service for mature or explicit content, exploitation, harassment, violence, self-harm facilitation, dangerous wrongdoing or illegal activity. Do not attempt to bypass safety controls. You are responsible for reviewing AI-generated work, checking important facts and following your school, workplace and local rules.</p>
                <h3>Privacy Notice</h3><p>In this version, saved chats, memory notes, selected modes and API keys are stored in your browser on this device. They are not synced to an AXES account by this app. When you send a prompt, the prompt and relevant chat context are sent to the AI provider you selected, together with its API key, to generate a response. Research mode may send queries to the connected provider search service. Provider privacy and retention practices are controlled by that provider; review its terms before connecting a key. Do not submit sensitive personal information.</p>
                <h3>AI & Education Disclaimer</h3><p>AXES AI can make mistakes and is not a substitute for a qualified teacher, professional advice or verified primary sources. Use it as a learning aid, not as an unquestionable authority. Safety screening can make mistakes and cannot guarantee that every unsafe output will be blocked.</p>
                <h3>Acceptable Use</h3><p>Allowed: age-appropriate learning, homework support, coding, science, history, language practice, research, study planning and positive creative projects. Not allowed: pornography or explicit sexual content, sexual exploitation, graphic violence, instructions for weapons or dangerous acts, self-harm instructions, criminal facilitation, hate or targeted abuse.</p>
              </div>
            </section>
            <div className="settings-note"><span className="settings-kicker">LOCAL DATA & PRIVACY</span><br/>Supported providers: OpenAI, Google Gemini, Anthropic Claude, Groq, DeepSeek, OpenRouter and MeshAPI. API keys and chats are saved in this browser on this device. They are not synced to an AXES account or committed to GitHub. Prompts are sent to the selected AI provider when you use AXES AI. Clearing browser data or removing a key will erase that local copy.</div>
            </div>
          </div> : messages.length === 0 ? <>
            <div className="welcome-eyebrow"><span className="status-dot"/> YOUR PERSONAL AI WORKSPACE</div>
            <div className="welcome-title"><h1>One space.<br/><em>Every model.</em></h1><p>Chat with different AI models, compare their answers, and find the right one for every task.</p></div>
            <div className="research-composer">
              <div className="composer-top"><span className="composer-label"><Sparkles size={14}/> New chat</span><span className="private-label"><span/> Your workspace</span></div>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => {if(e.key === "Enter" && !e.shiftKey){e.preventDefault();startResearch();}}} placeholder="Message AXES AI…" rows={3}/>
              <div className="composer-bottom">
                <div className="composer-tools"><button title="Attach files"><Paperclip size={16}/></button><button title="Search the web"><Globe2 size={16}/><span>Web</span></button><button title="Research settings"><SlidersHorizontal size={15}/></button></div>
                <div className="composer-controls">
                  <button className={researchMode ? "mode-select research-mode-active" : "mode-select"} type="button" aria-pressed={researchMode} onClick={() => setResearchMode((value) => !value)} title="Toggle structured deep analysis mode"><Microscope size={14}/>{researchMode ? "Research mode" : "Chat mode"}</button>
                  <div className="model-wrap"><button className="model-select" onClick={() => setModelOpen(!modelOpen)}><span className={"model-mark "+selectedModel.tone}>{selectedModel.mark}</span><span>{selectedModel.model}</span><ChevronDown size={13}/></button>
                    {modelOpen && <div className="model-menu">{models.map((m) => <button key={m.providerId + ":" + (m.keyId || "none") + ":" + m.model} onClick={() => {setSelectedModel(m);setModelOpen(false);}}><span className={"model-mark "+m.tone}>{m.mark}</span><span><b>{m.model}</b><small>{m.provider}</small></span>{selectedModel.providerId === m.providerId && selectedModel.keyId === m.keyId && selectedModel.model === m.model && <Check size={14}/>}</button>)}</div>}
                  </div>
                  <button className="send-button" disabled={!prompt.trim()} aria-label="Send message" onClick={() => startResearch()}><ArrowUp size={17}/></button>
                </div>
              </div>
              <div className="composer-footnote">AI-generated responses may be inaccurate. Check important claims against primary sources. {activeResearchMode ? "Live web search and linked sources work with compatible Gemini and Claude models. Provider search charges may apply." : ""} Chats and API keys are saved in this browser on this device.</div>
            </div>
            <div className="workspace-footer"><span><span className="footer-dot"/> Ready to explore</span><span>AI, on your terms <b>·</b> AXES AI</span></div>
          </> : <div className="research-session">
            <div className="chat-toolbar">
              <div className="chat-model-wrap">
                <span className="chat-brand-mark"><Atom size={16}/></span>
                <span className="chat-product-name">AXES AI</span>
                <div className="chat-mode-picker"><button type="button" className="chat-mode-indicator" title="Change the personality mode used for new answers" aria-haspopup="menu" aria-expanded={chatModeMenuOpen} onClick={() => setChatModeMenuOpen((open) => !open)}><Sparkles size={13}/><span>{personaMode === "bro" ? "Bro Mode" : personaMode === "professor" ? "Professor Mode" : personaMode === "god" ? "God Mode" : personaMode === "teacher" ? "Teacher Mode" : personaMode === "exam-coach" ? "Exam Coach" : personaMode === "researcher" ? "Researcher Mode" : personaMode === "coding-mentor" ? "Coding Mentor" : "Socratic Tutor"}</span><ChevronDown size={11}/></button>{chatModeMenuOpen && <div className="chat-mode-menu" role="menu" aria-label="Choose personality mode">{[{id:"bro",name:"Bro Mode",desc:"Casual and relatable"},{id:"professor",name:"Professor Mode",desc:"Academic and rigorous"},{id:"god",name:"God Mode",desc:"Deepest useful analysis"},{id:"teacher",name:"Teacher Mode",desc:"Patient step-by-step teaching"},{id:"exam-coach",name:"Exam Coach",desc:"Marks and exam preparation"},{id:"researcher",name:"Researcher Mode",desc:"Evidence-first investigation"},{id:"coding-mentor",name:"Coding Mentor",desc:"Build and debug with guidance"},{id:"socratic",name:"Socratic Tutor",desc:"Learn through guided questions"}].map((mode) => <button type="button" role="menuitemradio" aria-checked={activePersonaMode===mode.id} key={mode.id} onClick={() => selectChatPersonaMode(mode.id)}><span><b>{mode.name}</b><small>{mode.desc}</small></span>{activePersonaMode===mode.id && <Check size={14}/>}</button>)}</div>}</div>
                <span className="chat-toolbar-divider">/</span>
                <button className="chat-model-button" type="button" onClick={() => setModelOpen(!modelOpen)}>
                  {selectedModel.model}<ChevronDown size={13}/>
                </button>
                {modelOpen && <div className="chat-model-menu">{models.map((m) => <button key={m.providerId + ":" + (m.keyId || "none") + ":" + m.model} onClick={() => {setSelectedModel(m);setModelOpen(false);}}><span className={"model-mark " + m.tone}>{m.mark}</span><span><b>{m.model}</b><small>{m.provider}</small></span>{selectedModel.providerId === m.providerId && selectedModel.keyId === m.keyId && selectedModel.model === m.model && <Check size={14}/>}</button>)}</div>}
              </div>
              <div className="chat-toolbar-actions">
                <div className="chat-export-wrap">
                  <button type="button" className="chat-export-button" onClick={() => setExportMenuOpen((open) => !open)} aria-expanded={exportMenuOpen} title="Export conversation" disabled={!turns.length}>
                    <Download size={14}/> <span>Export</span>
                  </button>
                  {exportMenuOpen && <div className="chat-export-menu">
                    <button type="button" onClick={() => exportCurrentChat("md")}>Markdown (.md)</button>
                    <button type="button" onClick={() => exportCurrentChat("txt")}>Plain text (.txt)</button>
                  </div>}
                </div>
                <span className="chat-status-label"><span className="status-dot"/> {researching ? (activeResearchMode ? "Researching" : "Thinking") : "Ready"}</span>
              </div>
            </div>
            <div className="chat-thread" ref={chatThreadRef}>
              {turns.map((turn, index) => <div className="chat-turn" key={turn.id} ref={index === turns.length - 1 ? latestTurnRef : undefined}>
                <div className="user-message-row"><div className="user-message-bubble">
                  {editingTurnId === turn.id ? <div className="message-edit-box">
                    <textarea value={editDraft} onChange={(event) => setEditDraft(event.target.value)} rows={Math.min(8, Math.max(2, editDraft.split("\\n").length))} autoFocus aria-label="Edit your question"/>
                    <div className="message-edit-actions">
                      <button type="button" onClick={() => { setEditingTurnId(null); setEditDraft(""); }}>Cancel</button>
                      <button type="button" className="message-edit-save" disabled={!editDraft.trim() || researching} onClick={() => startResearch(editDraft, { replaceFromTurnId: turn.id })}>Save &amp; regenerate</button>
                    </div>
                  </div> : <>{turn.question}<button type="button" className="message-edit-trigger" title="Edit question" aria-label="Edit question" onClick={() => { setEditingTurnId(turn.id); setEditDraft(turn.question); }}><FileText size={13}/><span>Edit</span></button></>}
                </div></div>
                <div className="assistant-message-row">
                  <div className="assistant-avatar"><Atom size={17}/></div>
                  <div className="assistant-message-content">
                    <div className="assistant-name">AXES AI <span>{turn.model || selectedModel.model}</span></div>
                    {researching && !turn.answer && !turn.error && turn.id === turns[turns.length - 1]?.id
                      ? <div className="thinking-indicator"><i/><i/><i/> <span>{activeResearchMode ? "Building research brief…" : "Thinking…"}</span></div>
                      : turn.answer ? <div className="assistant-answer-text">{renderAnswerMarkdown(turn.answer)}</div>
                      : turn.error ? <div className="turn-error-block"><p className="research-error">{turn.error}</p><button type="button" className="retry-answer-button" disabled={researching} onClick={() => startResearch(turn.question, { replaceFromTurnId: turn.id })}><RefreshCw size={13}/> Retry response</button></div>
                      : <p className="assistant-waiting-copy">Waiting for response…</p>}
                    {turn.answer && <div className="answer-actions"><button type="button" title="Copy response" onClick={() => navigator.clipboard?.writeText(turn.answer)}><FileText size={14}/> Copy</button><button type="button" title="Branch from this point" onClick={() => branchConversationFromTurn(turn.id)}><GitBranch size={14}/> Branch</button><span>{turn.provider ? `Generated by ${turn.provider}` : "Saved response"}</span></div>}
                  </div>
                </div>
              </div>)}
              {researching && messages.length === 0 && <div className="assistant-message-row"><div className="assistant-avatar"><Atom size={17}/></div><div className="thinking-indicator"><i/><i/><i/> <span>Thinking…</span></div></div>}
              {!researching && !researchAnswer && !researchError && messages.length === 0 && <div className="chat-empty-state"><div className="chat-empty-icon"><Sparkles size={22}/></div><h2>What would you like to explore?</h2><p>Ask a question and AXES AI will find an available model in your API chain.</p></div>}
            </div>
            <div className="chat-composer-dock">
              <div className="chat-composer">
                <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} onKeyDown={e=>{if(e.key === "Enter" && !e.shiftKey){e.preventDefault();startResearch();}}} placeholder="Message AXES AI…" rows={2}/>
                <div className="chat-composer-bottom">
                  <div className="chat-composer-tools"><button type="button" title="Attach files"><Paperclip size={16}/></button><button type="button" className={activeResearchMode ? "chat-research-toggle active" : "chat-research-toggle"} aria-pressed={activeResearchMode} onClick={toggleChatResearchMode} title="Toggle live web search"><Globe2 size={14}/><span>{activeResearchMode ? "Web search on" : "Web search"}</span></button><span>Shift + Enter for a new line</span></div>
                  <button className="chat-send-button" disabled={!prompt.trim() || researching} onClick={()=>startResearch()} aria-label="Send message"><ArrowUp size={18}/></button>
                </div>
              </div>
              <p className="chat-disclaimer">AXES AI can make mistakes. Verify important information.{activeResearchMode ? " Live web search and linked sources are supported with compatible Gemini and Claude models; other providers use deep analysis without live search. Provider search charges may apply." : ""}</p>
            </div>
          </div>}
        </div>
      </div>
    </section>
    {showApiFailureDialog && <div className="api-failure-overlay" role="dialog" aria-modal="true" aria-labelledby="api-failure-title"><div className="api-failure-dialog"><span className="settings-card-icon"><KeyRound size={19}/></span><h2 id="api-failure-title">All API keys failed</h2><p>AXES AI tried every connected key, but none returned an answer. Here are the provider responses so you can identify the problem.</p>{apiFailureDetails.length > 0 && <ul className="api-failure-details">{apiFailureDetails.map((detail, index) => <li key={index}>{detail}</li>)}</ul>}<div className="settings-actions"><button className="settings-save" onClick={() => {setShowApiFailureDialog(false);setActiveNav("Settings");}}>Open API settings</button><button className="settings-remove" onClick={() => setShowApiFailureDialog(false)}>Dismiss</button></div></div></div>}
  </main>;
}
