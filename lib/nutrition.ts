// Real nutrition target engine (Mifflin–St Jeor → TDEE → goal → macros).
// Used by the onboarding wizard so each user gets personalized targets.

export type Sex = "homme" | "femme";
export type Goal = "perte" | "recomp" | "maintien" | "masse" | "endurance";
export type Activity = "sedentaire" | "leger" | "modere" | "actif" | "tres_actif";
export type Morph = "ecto" | "meso" | "endo";

export const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentaire: 1.2,
  leger: 1.375,
  modere: 1.55,
  actif: 1.725,
  tres_actif: 1.9,
};

export interface CalcInput {
  sex: Sex;
  age: number;
  heightCm: number;
  currentKg: number;
  targetKg: number;
  goal: Goal;
  activity: Activity;
  morph: Morph;
  diabetic: boolean;
}

export interface Targets {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  bmr: number;
  tdee: number;
}

/** Mifflin–St Jeor basal metabolic rate. */
export function bmrMifflin(sex: Sex, kg: number, cm: number, age: number): number {
  const base = 10 * kg + 6.25 * cm - 5 * age;
  return sex === "homme" ? base + 5 : base - 161;
}

export function computeTargets(i: CalcInput): Targets {
  const bmr = Math.round(bmrMifflin(i.sex, i.currentKg, i.heightCm, i.age));
  const tdee = Math.round(bmr * ACTIVITY_FACTOR[i.activity]);

  // Calorie target by goal.
  const goalFactor: Record<Goal, number> = {
    perte: 0.8, // ~ -20% déficit
    recomp: 0.9,
    maintien: 1.0,
    masse: 1.12, // léger surplus
    endurance: 1.0,
  };
  let calories = Math.round((tdee * goalFactor[i.goal]) / 10) * 10;
  // Floor de sécurité (jamais sous le BMR de plus de ~10%).
  calories = Math.max(calories, Math.round((bmr * 1.0) / 10) * 10, i.sex === "femme" ? 1200 : 1500);

  // Protéines : g/kg selon objectif (réf = poids cible, ou actuel si prise de masse).
  const refKg = i.goal === "masse" ? i.currentKg : i.targetKg;
  const proteinPerKg =
    i.goal === "perte" || i.goal === "recomp" || i.goal === "masse" ? 2.0 : 1.7;
  const protein = Math.round(refKg * proteinPerKg);

  // Lipides : % des calories (plus haut si endomorphe ou diabétique → moins de glucides).
  const fatPct = i.morph === "endo" || i.diabetic ? 0.32 : 0.27;
  let fats = Math.round((calories * fatPct) / 9);

  // Glucides = reste.
  let carbs = Math.round((calories - protein * 4 - fats * 9) / 4);
  if (carbs < 0) carbs = 0;

  // Diabétique / endomorphe : plafonner les glucides, basculer le surplus en lipides.
  if (i.goal !== "endurance" && (i.diabetic || i.morph === "endo")) {
    const cap = Math.round(refKg * (i.diabetic ? 1.3 : 2.0));
    if (carbs > cap) {
      const diff = carbs - cap;
      carbs = cap;
      fats += Math.round((diff * 4) / 9);
    }
  }

  return { calories, protein, carbs, fats, bmr, tdee };
}

export const GOAL_LABELS: Record<Goal, string> = {
  perte: "Perte de poids",
  recomp: "Recomposition",
  maintien: "Maintien",
  masse: "Prise de masse",
  endurance: "Endurance / Perf",
};

export const ACTIVITY_LABELS: Record<Activity, string> = {
  sedentaire: "Sédentaire",
  leger: "Léger",
  modere: "Modéré",
  actif: "Actif",
  tres_actif: "Très actif",
};

export const MORPH_LABELS: Record<Morph, string> = {
  endo: "Je prends du gras facilement",
  meso: "Corps plutôt équilibré",
  ecto: "Je reste mince / prends difficilement",
};
