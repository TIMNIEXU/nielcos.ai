/* GRI-001 V2 — LLM provider layer (server-side only).
   OpenAI-compatible chat-completions interface so the provider is swappable:
     AI_API_KEY   — provider key (Vercel Production env, set by Tim)
     AI_API_BASE  — default https://api.openai.com/v1 (DeepSeek: https://api.deepseek.com/v1)
     AI_MODEL     — default gpt-4o-mini
   No key is ever read from, or sent to, the client. */

export type ChatMsg = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
  name?: string;
};

export type ToolDef = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export type AssistantMsg = {
  role: "assistant";
  content: string | null;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
};

export type ProviderResult =
  | { ok: true; message: AssistantMsg }
  | { ok: false; error: "not_configured" | "provider_error" | "timeout" | "bad_response"; detail?: string };

export function isConfigured(): boolean {
  return !!process.env.AI_API_KEY;
}

export async function chatCompletion(opts: {
  messages: ChatMsg[];
  tools?: ToolDef[];
  maxRounds?: number;
}): Promise<ProviderResult> {
  const key = process.env.AI_API_KEY;
  if (!key) return { ok: false, error: "not_configured" };
  const base = (process.env.AI_API_BASE ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.AI_MODEL ?? "gpt-4o-mini";

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: opts.messages,
        tools: opts.tools?.length ? opts.tools : undefined,
        tool_choice: opts.tools?.length ? "auto" : undefined,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "").then((t) => t.slice(0, 300));
      console.error("ai provider error:", res.status, detail);
      return { ok: false, error: "provider_error", detail: `HTTP ${res.status}` };
    }
    const data = await res.json();
    const message = data?.choices?.[0]?.message;
    if (!message) return { ok: false, error: "bad_response" };
    return { ok: true, message };
  } catch (e) {
    const msg = (e as Error)?.message ?? "";
    console.error("ai provider exception:", msg);
    return { ok: false, error: msg.includes("timeout") ? "timeout" : "provider_error" };
  }
}
