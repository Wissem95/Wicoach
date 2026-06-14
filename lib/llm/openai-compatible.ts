import type {
  LLMProvider,
  ChatOptions,
  AnalyzeImageOptions,
  RunCoachOptions,
  ToolDeclaration,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Config {
  name: string;
  baseURL: string; // e.g. https://api.groq.com/openai/v1
  apiKey: string;
  model: string;
  extraHeaders?: Record<string, string>;
}

// Gemini tool schemas use UPPERCASE types ("OBJECT"); OpenAI expects lowercase.
function toOpenAISchema(node: any): any {
  if (Array.isArray(node)) return node.map(toOpenAISchema);
  if (node && typeof node === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = k === "type" && typeof v === "string" ? (v as string).toLowerCase() : toOpenAISchema(v);
    }
    return out;
  }
  return node;
}

function toOpenAITools(tools: ToolDeclaration[]) {
  return tools.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: toOpenAISchema(t.parameters) },
  }));
}

/**
 * Works with any OpenAI-compatible chat API (Groq, OpenRouter, Together…).
 */
export class OpenAICompatibleProvider implements LLMProvider {
  constructor(private cfg: Config) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.cfg.apiKey}`,
      "Content-Type": "application/json",
      ...this.cfg.extraHeaders,
    };
  }

  async *chat(opts: ChatOptions): AsyncIterable<string> {
    const res = await fetch(`${this.cfg.baseURL}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: this.cfg.model,
        stream: true,
        temperature: opts.temperature ?? 0.6,
        messages: [{ role: "system", content: opts.system }, ...opts.messages],
      }),
    });
    if (!res.ok || !res.body) {
      throw new Error(`${this.cfg.name} ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const data = t.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          const delta = JSON.parse(data).choices?.[0]?.delta?.content;
          if (delta) yield delta as string;
        } catch {
          /* ignore keep-alive lines */
        }
      }
    }
  }

  async analyzeImage(opts: AnalyzeImageOptions): Promise<string> {
    const res = await fetch(`${this.cfg.baseURL}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: this.cfg.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: opts.prompt },
              { type: "image_url", image_url: { url: `data:${opts.mimeType};base64,${opts.imageBase64}` } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`${this.cfg.name} ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  async runCoach(opts: RunCoachOptions): Promise<string> {
    const tools = toOpenAITools(opts.tools);
    const msgs: any[] = [
      { role: "system", content: opts.system },
      ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
    ];
    const maxSteps = opts.maxSteps ?? 6;

    for (let step = 0; step < maxSteps; step++) {
      const res = await fetch(`${this.cfg.baseURL}/chat/completions`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          model: this.cfg.model,
          temperature: 0.6,
          messages: msgs,
          tools,
          tool_choice: "auto",
        }),
      });
      if (!res.ok) throw new Error(`${this.cfg.name} ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const choice = (await res.json()).choices?.[0]?.message;
      if (!choice) return "";

      const calls = choice.tool_calls;
      if (calls && calls.length > 0) {
        msgs.push(choice);
        for (const c of calls) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(c.function?.arguments || "{}");
          } catch {
            /* ignore */
          }
          let result: unknown;
          try {
            result = await opts.onToolCall(c.function?.name ?? "", args);
          } catch (err) {
            result = { error: err instanceof Error ? err.message : "tool error" };
          }
          msgs.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify({ result }) });
        }
        continue;
      }
      return choice.content ?? "";
    }
    return "J'ai fait plusieurs ajustements — dis-moi si tu veux autre chose.";
  }
}
