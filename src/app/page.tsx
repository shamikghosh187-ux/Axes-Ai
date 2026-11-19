"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Atom, ArrowUp, ChevronDown, Plus, Search, FileText,
  Settings2, Sparkles, Globe2, Paperclip, BrainCircuit,
  PanelLeftClose, Command, Orbit, Library, SlidersHorizontal,
  MoreHorizontal, Check, Menu, Eye, EyeOff, KeyRound, ShieldCheck, Trash2
} from "lucide-react";

type ResearchTurn = { id: string; question: string; answer: string; model: string; provider: string; error?: string };
type ResearchProject = { id: string; title: string; questions: string[]; answer: string; model: string; updatedAt: number; turns?: ResearchTurn[] };

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
  const normalizedSource = source.replace(/<br\s*\/?>/gi, "\n").replace(/\r\n?/g, "\n").replace(/\s*\|\|\s*/g, "\n\n").replace(/\s+\|\s+(?=\*\*[^*]+\*\*)/g, "\n").replace(/\s+\|\s+(?=(?:Snap|Blocking|Formation):)/g, "\n");
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
      blocks.push(<pre key={"code-" + i} data-language={language}><code>{code.join("\n")}</code></pre>);
      continue;
    }
    if (/^(---+|\*\*\*|___)$/.test(line)) { blocks.push(<hr key={"hr-" + i++}/>); continue; }
    if (line.startsWith("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const parseCells = (row: string) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(cell => cell.trim());
      const headers = parseCells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(parseCells(lines[i++]));
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
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|\x60\x60\x60|---+|\*\*\*|___|\s*>|\s*[-*+]\s+|\s*\d+[.)]\s+)/.test(lines[i].trim()) && !(lines[i].trim().startsWith("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1]))) paragraph.push(lines[i++].trim());
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
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [memoryNotes, setMemoryNotes] = useState("");
  const chatThreadRef = useRef<HTMLDivElement>(null);
  const latestTurnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!turns.length) return;
    const thread = chatThreadRef.current;
    const latestTurn = latestTurnRef.current;
    if (!thread || !latestTurn) return;
    const targetTop = latestTurn.offsetTop - thread.offsetTop + thread.scrollTop;
    thread.scrollTo({ top: Math.max(0, targetTop - 12), behavior: "smooth" });
  }, [turns.length, turns[turns.length - 1]?.id]);

  useEffect(() => {
    // Restore chats and migrate API credentials/chain from the older tab-only storage.
    try {
      setMemoryEnabled(window.localStorage.getItem("axes:memory-enabled") !== "false");
      setMemoryNotes(window.localStorage.getItem("axes:memory-notes") || "");
      const savedProjects = window.localStorage.getItem("axes:research-projects");
      const restoredProjects = savedProjects ? JSON.parse(savedProjects) as ResearchProject[] : [];
      setProjects(restoredProjects);
      if (restoredProjects.length) {
        const latest = restoredProjects[0];
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

  async function startResearch(value = prompt) {
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

    const first = candidates[0];
    const projectId = currentProjectId ?? crypto.randomUUID();
    const existingProject = projects.find((item) => item.id === projectId);
    const now = Date.now();
    const newProject: ResearchProject = {
      id: projectId,
      title: question.length > 72 ? question.slice(0, 69) + "…" : question,
      questions: [question],
      answer: "",
      model: first.model,
      turns: [],
      updatedAt: now,
    };
    setSelectedModel(first);
    setCurrentProjectId(projectId);
    const pendingTurn: ResearchTurn = { id: crypto.randomUUID(), question, answer: "", model: first.model, provider: first.provider };
    const previousTurns = existingProject ? getProjectTurns(existingProject) : [];
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
      ? old.map((item) => item.id === projectId ? { ...item, questions: [...item.questions, question], turns: [...previousTurns, pendingTurn], updatedAt: now } : item)
      : [{ ...newProject, turns: [pendingTurn] }, ...old]);
    setPrompt("");
    setResearchAnswer("");
    setResearchError("");
    setMessages((old) => [...old, question]);
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
            body: JSON.stringify({ provider: candidate.providerId, model: candidate.model, apiKey: key, question, history: currentChatHistory, previousChats: previousChatMemory, memoryNotes: memoryEnabled ? memoryNotes.slice(0, 3000) : "" }),
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

  return <main className="axes-app">
    {sidebarOpen && <aside className="axes-sidebar">
      <div className="sidebar-top">
        <Brand />
        <button className="icon-button sidebar-collapse" aria-label="Collapse sidebar" onClick={() => setSidebarOpen(false)}><PanelLeftClose size={17}/></button>
      </div>
      <button className="new-research" onClick={() => { setActiveNav("New chat"); setMessages([]); setTurns([]); setResearchAnswer(""); setResearchError(""); setCurrentProjectId(null); }}><Plus size={16}/> <span>New chat</span><span className="shortcut">⌘ K</span></button>
      {projects.length > 0 && <><div className="sidebar-section-label">RECENT PROJECTS</div><nav className="sidebar-nav">{projects.slice(0, 8).map((project) => <button key={project.id} className={currentProjectId === project.id ? "nav-item active" : "nav-item"} onClick={() => { setCurrentProjectId(project.id); setMessages(project.questions); setTurns(getProjectTurns(project)); setResearchAnswer(project.answer); setResearchError(""); setActiveNav("Research project"); }}><FileText size={15}/><span>{project.title}</span></button>)}</nav></>}
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
            <div className="settings-heading settings-hero"><span className="settings-kicker">AXES CONTROL CENTER</span><h1>Settings</h1><p>Manage AI providers, routing, memory and local workspace preferences.</p><div className="settings-overview-grid"><div className="settings-overview-card"><span>Connected providers</span><b>{connectedProviders.length}</b><small>Providers with saved keys</small></div><div className="settings-overview-card"><span>Saved API keys</span><b>{providers.reduce((total, provider) => total + readProviderKeys(provider.id).length, 0)}</b><small>Stored in this browser</small></div><div className="settings-overview-card"><span>Active chain</span><b>{apiChain.length}<i>/6</i></b><small>Ordered fallback keys</small></div><div className="settings-overview-card"><span>AI memory</span><b className="settings-memory-status">{memoryEnabled ? "On" : "Off"}</b><small>Cross-chat context</small></div></div></div>
            <div className="settings-section-intro"><div><span className="settings-kicker">01 · PROVIDERS</span><h2>AI connections</h2><p>Choose a provider to add, validate or manage its API keys.</p></div><span className="settings-section-count">{providers.length} providers supported</span></div>
            <div className="provider-grid">
              {providers.map((provider) => <button type="button" key={provider.id} className={apiProvider === provider.id ? "provider-card selected" : "provider-card"} onClick={() => { setApiProvider(provider.id); setApiKey(""); setApiKeys(readProviderKeys(provider.id)); setApiKeySaved(readProviderKeys(provider.id).length > 0); setModelsError(""); }}>
                <span className={"provider-mark " + provider.tone}>{provider.mark}</span><span className="provider-card-copy"><b>{provider.name}</b><small>{connectedProviders.includes(provider.id) ? "API key connected · models ready" : "Select to add or manage a key"}</small></span><span className="provider-card-action">{connectedProviders.includes(provider.id) ? "Manage key" : "Add API key"} <Plus size={13}/></span>
              </button>)}
            </div>
            <section className="api-chain-card" id="api-chain"><div className="settings-section-label"><span className="settings-kicker">02 · ROUTING</span><span>Automatic provider failover</span></div>
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
            <section className="settings-card">
              <div className="settings-card-title"><span className="settings-card-icon"><KeyRound size={17}/></span><div><h2>{providers.find((p) => p.id === apiProvider)?.name || "Provider"} API key</h2><p>Enter your key to load the available models for this provider.</p></div></div>
              <div className="saved-api-keys"><div className="settings-label">Saved keys ({apiKeys.length})</div>{apiKeys.map((savedKey, index) => <div className="saved-api-key-row" key={savedKey.id}><span><b>Key {index + 1}</b><small>••••••••{savedKey.value.slice(-4)}</small></span><button type="button" className="settings-remove" onClick={() => removeApiKey(savedKey.id)}><Trash2 size={13}/> Remove</button></div>)}</div>
              <label className="settings-label" htmlFor="provider-key">Add another API key</label><div className="api-key-field"><input id="provider-key" type={showApiKey ? "text" : "password"} value={apiKey} onChange={(e)=>{setApiKey(e.target.value);setApiKeySaved(false);}} placeholder={`Paste your ${providers.find((p)=>p.id===apiProvider)?.name || apiProvider} API key`} autoComplete="off"/><button type="button" aria-label={showApiKey ? "Hide API key" : "Show API key"} onClick={()=>setShowApiKey(!showApiKey)}>{showApiKey ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div>
              <div className="settings-security"><ShieldCheck size={15}/><span>Your key is stored in this browser on this device and used for model discovery and requests. Browser storage is not encrypted by AXES AI, so only save keys on a trusted device.</span></div>
              {modelsLoading && <p>Loading available models…</p>}{modelsError && <p className="research-error">{modelsError}</p>}{apiKeySaved && !modelsLoading && !modelsError && <p>{models.length} models loaded for {providers.find((p)=>p.id===apiProvider)?.name}.</p>}
              <div className="settings-actions"><button className="settings-save" disabled={!apiKey.trim() || modelsLoading} onClick={saveApiKey}>{modelsLoading ? "Connecting…" : "Add API key"}</button></div>
            </section>
            <section className="settings-card memory-settings-card" id="memory-settings"><div className="settings-section-label"><span className="settings-kicker">04 · PERSONALIZATION</span><span>Context across conversations</span></div>
              <div className="settings-card-title"><span className="settings-card-icon"><BrainCircuit size={17}/></span><div><h2>Persistent AI memory</h2><p>Let AXES AI use relevant details from your earlier chats in this browser.</p></div></div>
              <div className="memory-toggle-row"><div><b>{memoryEnabled ? "Memory is on" : "Memory is off"}</b><small>{memoryEnabled ? "Previous chats and your notes can inform new conversations." : "New conversations will not use previous-chat context."}</small></div><button type="button" className={memoryEnabled ? "memory-toggle active" : "memory-toggle"} role="switch" aria-checked={memoryEnabled} onClick={() => setMemoryEnabled((value) => !value)}><span/></button></div>
              <label className="settings-label" htmlFor="axes-memory-notes">Things AXES AI should remember</label>
              <textarea id="axes-memory-notes" className="memory-notes-input" value={memoryNotes} onChange={(event) => setMemoryNotes(event.target.value)} placeholder="Add preferences, ongoing projects, goals, or other context you want AXES AI to remember…" rows={5} disabled={!memoryEnabled}/>
              <div className="memory-footnote">Memory is stored locally in this browser alongside your saved chats. It is not synced between devices. Do not store passwords or API keys here.</div>
            </section>
            <div className="settings-note"><span className="settings-kicker">LOCAL DATA & PRIVACY</span><br/>Supported providers: OpenAI, Google Gemini, Anthropic Claude, Groq, DeepSeek, OpenRouter and MeshAPI. API keys and chats are saved in this browser on this device. They are not synced to an AXES account or committed to GitHub. Clearing browser data or removing a key will erase that local copy.</div>
          </div> : messages.length === 0 ? <>
            <div className="welcome-eyebrow"><span className="status-dot"/> YOUR PERSONAL AI WORKSPACE</div>
            <div className="welcome-title"><h1>One space.<br/><em>Every model.</em></h1><p>Chat with different AI models, compare their answers, and find the right one for every task.</p></div>
            <div className="research-composer">
              <div className="composer-top"><span className="composer-label"><Sparkles size={14}/> New chat</span><span className="private-label"><span/> Your workspace</span></div>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => {if(e.key === "Enter" && !e.shiftKey){e.preventDefault();startResearch();}}} placeholder="Message AXES AI…" rows={3}/>
              <div className="composer-bottom">
                <div className="composer-tools"><button title="Attach files"><Paperclip size={16}/></button><button title="Search the web"><Globe2 size={16}/><span>Web</span></button><button title="Research settings"><SlidersHorizontal size={15}/></button></div>
                <div className="composer-controls">
                  <button className="mode-select" type="button"><Orbit size={14}/>Chat mode</button>
                  <div className="model-wrap"><button className="model-select" onClick={() => setModelOpen(!modelOpen)}><span className={"model-mark "+selectedModel.tone}>{selectedModel.mark}</span><span>{selectedModel.model}</span><ChevronDown size={13}/></button>
                    {modelOpen && <div className="model-menu">{models.map((m) => <button key={m.providerId + ":" + (m.keyId || "none") + ":" + m.model} onClick={() => {setSelectedModel(m);setModelOpen(false);}}><span className={"model-mark "+m.tone}>{m.mark}</span><span><b>{m.model}</b><small>{m.provider}</small></span>{selectedModel.providerId === m.providerId && selectedModel.keyId === m.keyId && selectedModel.model === m.model && <Check size={14}/>}</button>)}</div>}
                  </div>
                  <button className="send-button" disabled={!prompt.trim()} aria-label="Send message" onClick={() => startResearch()}><ArrowUp size={17}/></button>
                </div>
              </div>
              <div className="composer-footnote">AI-generated responses may be inaccurate. Check important claims against primary sources. Chats and API keys are saved in this browser on this device.</div>
            </div>
            <div className="workspace-footer"><span><span className="footer-dot"/> Ready to explore</span><span>AI, on your terms <b>·</b> AXES AI</span></div>
          </> : <div className="research-session">
            <div className="chat-toolbar">
              <div className="chat-model-wrap">
                <span className="chat-brand-mark"><Atom size={16}/></span>
                <span className="chat-product-name">AXES AI</span>
                <span className="chat-toolbar-divider">/</span>
                <button className="chat-model-button" type="button" onClick={() => setModelOpen(!modelOpen)}>
                  {selectedModel.model}<ChevronDown size={13}/>
                </button>
                {modelOpen && <div className="chat-model-menu">{models.map((m) => <button key={m.providerId + ":" + (m.keyId || "none") + ":" + m.model} onClick={() => {setSelectedModel(m);setModelOpen(false);}}><span className={"model-mark " + m.tone}>{m.mark}</span><span><b>{m.model}</b><small>{m.provider}</small></span>{selectedModel.providerId === m.providerId && selectedModel.keyId === m.keyId && selectedModel.model === m.model && <Check size={14}/>}</button>)}</div>}
              </div>
              <span className="chat-status-label"><span className="status-dot"/> {researching ? "Thinking" : "Ready"}</span>
            </div>
            <div className="chat-thread" ref={chatThreadRef}>
              {turns.map((turn, index) => <div className="chat-turn" key={turn.id} ref={index === turns.length - 1 ? latestTurnRef : undefined}>
                <div className="user-message-row"><div className="user-message-bubble">{turn.question}</div></div>
                <div className="assistant-message-row">
                  <div className="assistant-avatar"><Atom size={17}/></div>
                  <div className="assistant-message-content">
                    <div className="assistant-name">AXES AI <span>{turn.model || selectedModel.model}</span></div>
                    {researching && !turn.answer && !turn.error && turn.id === turns[turns.length - 1]?.id
                      ? <div className="thinking-indicator"><i/><i/><i/> <span>Thinking…</span></div>
                      : turn.answer ? <div className="assistant-answer-text">{renderAnswerMarkdown(turn.answer)}</div>
                      : turn.error ? <p className="research-error">{turn.error}</p>
                      : <p className="assistant-waiting-copy">Waiting for response…</p>}
                    {turn.answer && <div className="answer-actions"><button type="button" title="Copy response" onClick={() => navigator.clipboard?.writeText(turn.answer)}><FileText size={14}/> Copy</button><span>{turn.provider ? `Generated by ${turn.provider}` : "Saved response"}</span></div>}
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
                  <div className="chat-composer-tools"><button type="button" title="Attach files"><Paperclip size={16}/></button><button type="button" title="Web search"><Globe2 size={16}/></button><span>Shift + Enter for a new line</span></div>
                  <button className="chat-send-button" disabled={!prompt.trim() || researching} onClick={()=>startResearch()} aria-label="Send message"><ArrowUp size={18}/></button>
                </div>
              </div>
              <p className="chat-disclaimer">AXES AI can make mistakes. Verify important information.</p>
            </div>
          </div>}
        </div>
      </div>
    </section>
    {showApiFailureDialog && <div className="api-failure-overlay" role="dialog" aria-modal="true" aria-labelledby="api-failure-title"><div className="api-failure-dialog"><span className="settings-card-icon"><KeyRound size={19}/></span><h2 id="api-failure-title">All API keys failed</h2><p>AXES AI tried every connected key, but none returned an answer. Here are the provider responses so you can identify the problem.</p>{apiFailureDetails.length > 0 && <ul className="api-failure-details">{apiFailureDetails.map((detail, index) => <li key={index}>{detail}</li>)}</ul>}<div className="settings-actions"><button className="settings-save" onClick={() => {setShowApiFailureDialog(false);setActiveNav("Settings");}}>Open API settings</button><button className="settings-remove" onClick={() => setShowApiFailureDialog(false)}>Dismiss</button></div></div></div>}
  </main>;
}
