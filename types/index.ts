// Shared application types.

export type MealType = "petit_dej" | "dejeuner" | "diner" | "snack";
// Open-ended: the coach can use any activity (course, vélo, yoga, crossfit…).
export type TrainingType = string;
export type ChatRole = "user" | "assistant";

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  petit_dej: "Petit-déj",
  dejeuner: "Déjeuner",
  diner: "Dîner",
  snack: "Snack",
};

// Known types get a nice label; anything else falls back to a capitalized form.
export const TRAINING_TYPE_LABELS: Record<string, string> = {
  salle: "Salle",
  piscine: "Piscine",
  maison: "Maison",
  repos: "Repos",
  course: "Course",
  velo: "Vélo",
  marche: "Marche",
  yoga: "Yoga",
  crossfit: "CrossFit",
  hiit: "HIIT",
  musculation: "Muscu",
  cardio: "Cardio",
  etirements: "Étirements",
  sport_co: "Sport co",
};

// Suggested options for the dropdowns (the coach isn't limited to these).
export const TRAINING_TYPE_OPTIONS = [
  "salle",
  "maison",
  "piscine",
  "course",
  "velo",
  "marche",
  "yoga",
  "crossfit",
  "repos",
];

export function trainingLabel(t: string): string {
  if (!t) return "—";
  return TRAINING_TYPE_LABELS[t] ?? t.charAt(0).toUpperCase() + t.slice(1);
}

const TRAINING_COLORS: Record<string, string> = {
  salle: "bg-blue-500",
  piscine: "bg-cyan-500",
  maison: "bg-emerald-500",
  repos: "bg-slate-300",
  course: "bg-orange-500",
  velo: "bg-amber-500",
  marche: "bg-lime-500",
  yoga: "bg-violet-500",
  crossfit: "bg-rose-500",
};

export function trainingColor(t: string): string {
  return TRAINING_COLORS[t] ?? "bg-primary";
}

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
