import { z } from "zod";
import type { LLMProvider, ChatOptions, AnalyzeImageOptions, RunCoachOptions } from "./types";
import { GeminiProvider } from "./gemini";
import { OpenAICompatibleProvider } from "./openai-compatible";
import type { PhotoAnalysis } from "@/types";

export type { LLMProvider } from "./types";

// --- Provider construction from env --------------------------------------
function groq(model?: string): LLMProvider {
  return new OpenAICompatibleProvider({
    name: "Groq",
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY!,
    model: model || process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  });
}

function openrouter(model: string): LLMProvider {
  return new OpenAICompatibleProvider({
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY!,
    model,
    extraHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://wicoach.vercel.app",
      "X-Title": "Wicoach",
    },
  });
}

// Reasoning / chat / tool-use chain (Groq first to spare the Gemini quota).
function chatChain(): LLMProvider[] {
  const chain: LLMProvider[] = [];
  if (process.env.GROQ_API_KEY) chain.push(groq());
  if (process.env.GEMINI_API_KEY) chain.push(new GeminiProvider());
  if (process.env.OPENROUTER_API_KEY)
    chain.push(openrouter(process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free"));
  if (chain.length === 0) chain.push(new GeminiProvider());
  return chain;
}

// Vision chain (Gemini first — best free vision).
function visionChain(): LLMProvider[] {
  const chain: LLMProvider[] = [];
  if (process.env.GEMINI_API_KEY) chain.push(new GeminiProvider());
  if (process.env.OPENROUTER_API_KEY)
    chain.push(openrouter(process.env.OPENROUTER_VISION_MODEL || "google/gemini-2.0-flash-exp:free"));
  if (chain.length === 0) chain.push(new GeminiProvider());
  return chain;
}

const TRANSIENT = /(\b429\b|\b503\b|\b500\b|UNAVAILABLE|overloaded|high demand|rate.?limit|temporarily|timeout)/i;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Retry a call a few times on transient errors (overload / rate-limit) with backoff.
async function attempt<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (i < retries && TRANSIENT.test(msg)) {
        await sleep(500 * 2 ** i);
        continue;
      }
      throw err;
    }
  }
}

async function withFallback<T>(chain: LLMProvider[], fn: (p: LLMProvider) => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (const p of chain) {
    try {
      return await attempt(() => fn(p));
    } catch (err) {
      lastErr = err;
      console.error("[llm] provider failed, trying next:", err instanceof Error ? err.message : err);
    }
  }
  throw lastErr ?? new Error("Aucun fournisseur LLM configuré.");
}

// Routes each task to the right provider chain with automatic fallback.
class RoutingProvider implements LLMProvider {
  async *chat(opts: ChatOptions): AsyncIterable<string> {
    const chain = chatChain();
    let lastErr: unknown;
    for (const p of chain) {
      try {
        for await (const chunk of p.chat(opts)) yield chunk;
        return;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr;
  }

  runCoach(opts: RunCoachOptions): Promise<string> {
    return withFallback(chatChain(), (p) => p.runCoach(opts));
  }

  analyzeImage(opts: AnalyzeImageOptions): Promise<string> {
    return withFallback(visionChain(), (p) => p.analyzeImage(opts));
  }
}

let instance: RoutingProvider | null = null;
export function getLLM(): LLMProvider {
  if (!instance) instance = new RoutingProvider();
  return instance;
}

// --- Defensive parsing of the vision JSON ---------------------------------
const photoItemSchema = z.object({
  food: z.string().min(1),
  portion: z.union([z.string(), z.number()]).transform((v) => String(v)),
  calories: z.coerce.number().nonnegative().catch(0),
  protein: z.coerce.number().nonnegative().catch(0),
  carbs: z.coerce.number().nonnegative().catch(0),
  fats: z.coerce.number().nonnegative().catch(0),
});

const photoAnalysisSchema = z.object({
  meal_name: z.string().min(1).catch("Plat analysé"),
  total_calories: z.coerce.number().nonnegative().catch(0),
  confidence: z.coerce.number().catch(0),
  items: z.array(photoItemSchema).catch([]),
  notes: z.string().catch(""),
});

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return raw.slice(start, end + 1);
  return raw.trim();
}

export function parsePhotoAnalysis(raw: string): PhotoAnalysis | null {
  if (!raw) return null;
  try {
    const json = JSON.parse(extractJson(raw));
    const parsed = photoAnalysisSchema.parse(json);
    const items = parsed.items.map((i) => ({
      food: i.food,
      portion: i.portion,
      calories: Math.round(i.calories),
      protein: Math.round(i.protein),
      carbs: Math.round(i.carbs),
      fats: Math.round(i.fats),
    }));
    return {
      meal_name: parsed.meal_name,
      total_calories: Math.round(parsed.total_calories),
      confidence: Math.min(100, Math.max(0, Math.round(parsed.confidence))),
      items,
      notes: parsed.notes,
    };
  } catch {
    return null;
  }
}
