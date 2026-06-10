// Shared application types.

export type MealType = "petit_dej" | "dejeuner" | "diner" | "snack";
export type TrainingType = "salle" | "piscine" | "maison" | "repos";
export type ChatRole = "user" | "assistant";

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  petit_dej: "Petit-déj",
  dejeuner: "Déjeuner",
  diner: "Dîner",
  snack: "Snack",
};

export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  salle: "Salle",
  piscine: "Piscine",
  maison: "Maison",
  repos: "Repos",
};

export const DAY_LABELS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
] as const;

// A single food line, shared between manual entry, OFF search and AI analysis.
export interface FoodLine {
  food_name: string;
  portion: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

// Macro totals.
export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

// Open Food Facts normalized result.
export interface OffProduct {
  code: string | null;
  name: string;
  brand: string | null;
  nutritionGrade: string | null;
  imageUrl: string | null;
  // per 100g
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
}

// Gemini Vision structured result.
export interface PhotoAnalysisItem {
  food: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface PhotoAnalysis {
  meal_name: string;
  total_calories: number;
  confidence: number;
  items: PhotoAnalysisItem[];
  notes: string;
}

// Chat message shape used on the client.
export interface ChatMessageView {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}
