import { NextResponse } from "next/server";

const compatibleBases: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  groq: "https://api.groq.com/openai/v1",
  deepseek: "https://api.deepseek.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  meshapi: "https://api.meshapi.ai/v1",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const provider = String(body.provider || "").toLowerCase();
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const model = typeof body.model === "string" ? body.model.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 12000) : "";
    if (!apiKey || !model || !message) {
      return NextResponse.json({ error: "Missing title-generation details." }, { status: 400 });
    }

    const instruction = "Create a concise, meaningful title for a chat based on the user's first message. Understand the actual topic or intent, including unusual, vague, conversational, technical, or long messages. Return only the title, ideally 2–6 words and no more than 50 characters. Do not answer the message, do not use quotation marks, and do not merely capitalize or repeat the first few words.";
    let response: Response;

    if (provider === "gemini") {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instruction }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 40 },
        }),
      });
    } else if (provider === "anthropic") {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          model,
          max_tokens: 40,
          temperature: 0.2,
          system: instruction,
          messages: [{ role: "user", content: message }],
        }),
      });
    } else {
      const base = compatibleBases[provider];
      if (!base) return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
      response = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: instruction }, { role: "user", content: message }],
          temperature: 0.2,
          max_tokens: 40,
        }),
      });
    }

    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok || typeof data !== "object" || data === null) {
      return NextResponse.json({ error: "The model could not generate a chat title." }, { status: 502 });
    }
    const record = data as Record<string, unknown>;
    let title = "";
    if (provider === "gemini") {
      const candidates = Array.isArray(record.candidates) ? record.candidates : [];
      const first = candidates[0] as Record<string, unknown> | undefined;
      const content = first?.content as Record<string, unknown> | undefined;
      const parts = Array.isArray(content?.parts) ? content.parts : [];
      title = parts.map((part) => typeof part === "object" && part !== null && typeof (part as Record<string, unknown>).text === "string" ? (part as Record<string, string>).text : "").join(" ");
    } else if (provider === "anthropic") {
      const parts = Array.isArray(record.content) ? record.content : [];
      title = parts.map((part) => typeof part === "object" && part !== null && typeof (part as Record<string, unknown>).text === "string" ? (part as Record<string, string>).text : "").join(" ");
    } else {
      const choices = Array.isArray(record.choices) ? record.choices : [];
      const first = choices[0] as Record<string, unknown> | undefined;
      const messageData = first?.message as Record<string, unknown> | undefined;
      title = typeof messageData?.content === "string" ? messageData.content : "";
    }
    title = title.replace(/^["'`\s]+|["'`\s]+$/g, "").replace(/^title:\s*/i, "").replace(/\s+/g, " ").trim();
    if (!title) return NextResponse.json({ error: "No title was generated." }, { status: 502 });
    if (title.length > 50) title = title.slice(0, 47).trimEnd() + "…";
    return NextResponse.json({ title });
  } catch {
    return NextResponse.json({ error: "Title generation failed." }, { status: 500 });
  }
}
