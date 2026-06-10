import { z } from "zod";
import type { LLMProvider } from "./types";
import { GeminiProvider } from "./gemini";
import type { PhotoAnalysis } from "@/types";

export type { LLMProvider } from "./types";

// Single switch point: change this to use another provider later.
export function getLLM(): LLMProvider {
  return new GeminiProvider();
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

/** Strips ```json fences / surrounding prose the model may add. */
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return raw.slice(start, end + 1);
  }
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
