import { and, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  profiles,
  trainingPlan,
  pantryItems,
  favoriteMeals,
  weightLogs,
} from "@/db/schema";
import { todayISO } from "@/lib/utils";
import type { ToolDeclaration } from "@/lib/llm/types";

// ---- Tool declarations (sent to Gemini) ----------------------------------
export const coachToolDeclarations: ToolDeclaration[] = [
  {
    name: "remember",
    description:
      "Mémorise durablement un fait important sur l'utilisateur (aléa de vie, blessure, nouvelle habitude, préférence, horaire). À utiliser dès qu'il partage une info à retenir.",
    parameters: {
      type: "OBJECT",
      properties: { fact: { type: "STRING", description: "Le fait à retenir, concis." } },
      required: ["fact"],
    },
  },
  {
    name: "update_training_day",
    description: "Modifie un jour du plan d'entraînement hebdomadaire.",
    parameters: {
      type: "OBJECT",
      properties: {
        day_of_week: { type: "INTEGER", description: "0=Dimanche … 6=Samedi" },
        type: { type: "STRING", description: "salle | piscine | maison | repos" },
        focus: { type: "STRING", description: "Focus optionnel (ex: Haut du corps)" },
      },
      required: ["day_of_week", "type"],
    },
  },
  {
    name: "set_targets",
    description: "Ajuste les cibles nutritionnelles / le poids objectif de l'utilisateur.",
    parameters: {
      type: "OBJECT",
      properties: {
        target_calories: { type: "INTEGER" },
        target_protein: { type: "INTEGER" },
        target_carbs: { type: "INTEGER" },
        target_fats: { type: "INTEGER" },
        target_weight: { type: "NUMBER" },
      },
    },
  },
  {
    name: "add_pantry_item",
    description: "Ajoute un ingrédient au garde-manger.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING" },
        quantity: { type: "STRING", description: "optionnel" },
      },
      required: ["name"],
    },
  },
  {
    name: "remove_pantry_item",
    description: "Retire un ingrédient du garde-manger (par nom).",
    parameters: {
      type: "OBJECT",
      properties: { name: { type: "STRING" } },
      required: ["name"],
    },
  },
  {
    name: "save_favorite_meal",
    description:
      "Enregistre un repas favori / template (ex: un menu de journée concocté) avec ses aliments et macros.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING" },
        meal_type: { type: "STRING", description: "petit_dej | dejeuner | diner | snack" },
        items: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              food_name: { type: "STRING" },
              portion: { type: "NUMBER" },
              calories: { type: "INTEGER" },
              protein: { type: "INTEGER" },
              carbs: { type: "INTEGER" },
              fats: { type: "INTEGER" },
            },
            required: ["food_name"],
          },
        },
      },
      required: ["name", "items"],
    },
  },
  {
    name: "log_weight",
    description: "Enregistre une pesée de l'utilisateur.",
    parameters: {
      type: "OBJECT",
      properties: {
        weight: { type: "NUMBER" },
        date: { type: "STRING", description: "YYYY-MM-DD, défaut aujourd'hui" },
      },
      required: ["weight"],
    },
  },
];

// ---- Executor ------------------------------------------------------------
const TRAINING_TYPES = ["salle", "piscine", "maison", "repos"] as const;
const MEAL_TYPES = ["petit_dej", "dejeuner", "diner", "snack"] as const;

function num(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

export async function executeCoachTool(
  userId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case "remember": {
      const fact = String(args.fact ?? "").trim();
      if (!fact) return "rien à mémoriser";
      const line = `- (${todayISO()}) ${fact}`;
      await db
        .update(profiles)
        .set({
          coachNotes: sql`coalesce(${profiles.coachNotes} || E'\n', '') || ${line}`,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, userId));
      return `mémorisé: ${fact}`;
    }

    case "update_training_day": {
      const dow = Math.trunc(num(args.day_of_week) ?? -1);
      const type = String(args.type ?? "");
      if (dow < 0 || dow > 6 || !TRAINING_TYPES.includes(type as never))
        return "paramètres invalides";
      const focus = type === "repos" ? null : (args.focus ? String(args.focus).trim() : null);
      await db
        .insert(trainingPlan)
        .values({ userId, dayOfWeek: dow, type: type as never, focus })
        .onConflictDoUpdate({
          target: [trainingPlan.userId, trainingPlan.dayOfWeek],
          set: { type: type as never, focus },
        });
      return `jour ${dow} → ${type}${focus ? ` (${focus})` : ""}`;
    }

    case "set_targets": {
      const patch: Record<string, number> = {};
      const cal = num(args.target_calories);
      const prot = num(args.target_protein);
      const carb = num(args.target_carbs);
      const fat = num(args.target_fats);
      const tw = num(args.target_weight);
      if (cal !== null) patch.targetCalories = Math.round(cal);
      if (prot !== null) patch.targetProtein = Math.round(prot);
      if (carb !== null) patch.targetCarbs = Math.round(carb);
      if (fat !== null) patch.targetFats = Math.round(fat);
      if (tw !== null && tw >= 40 && tw <= 250) patch.targetWeight = tw;
      if (Object.keys(patch).length === 0) return "aucune cible fournie";
      await db.update(profiles).set({ ...patch, updatedAt: new Date() }).where(eq(profiles.id, userId));
      return `cibles mises à jour: ${JSON.stringify(patch)}`;
    }

    case "add_pantry_item": {
      const itemName = String(args.name ?? "").trim();
      if (!itemName) return "nom requis";
      await db
        .insert(pantryItems)
        .values({ userId, name: itemName, quantity: args.quantity ? String(args.quantity) : null });
      return `ajouté au garde-manger: ${itemName}`;
    }

    case "remove_pantry_item": {
      const itemName = String(args.name ?? "").trim();
      if (!itemName) return "nom requis";
      await db
        .delete(pantryItems)
        .where(and(eq(pantryItems.userId, userId), ilike(pantryItems.name, `%${itemName}%`)));
      return `retiré du garde-manger: ${itemName}`;
    }

    case "save_favorite_meal": {
      const mealName = String(args.name ?? "").trim();
      const mealType = MEAL_TYPES.includes(args.meal_type as never)
        ? (args.meal_type as string)
        : "dejeuner";
      const rawItems = Array.isArray(args.items) ? args.items : [];
      const items = rawItems.map((it) => {
        const o = it as Record<string, unknown>;
        return {
          food_name: String(o.food_name ?? "Aliment"),
          portion: num(o.portion) ?? 100,
          unit: "g",
          calories: Math.round(num(o.calories) ?? 0),
          protein: Math.round(num(o.protein) ?? 0),
          carbs: Math.round(num(o.carbs) ?? 0),
          fats: Math.round(num(o.fats) ?? 0),
        };
      });
      if (!mealName || items.length === 0) return "nom + aliments requis";
      await db
        .insert(favoriteMeals)
        .values({ userId, name: mealName, mealType: mealType as never, items });
      return `favori enregistré: ${mealName} (${items.length} aliments)`;
    }

    case "log_weight": {
      const w = num(args.weight);
      if (w === null || w < 40 || w > 250) return "poids invalide";
      const date =
        typeof args.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.date) && args.date <= todayISO()
          ? args.date
          : todayISO();
      await db
        .insert(weightLogs)
        .values({ userId, weight: w, loggedAt: date })
        .onConflictDoUpdate({ target: [weightLogs.userId, weightLogs.loggedAt], set: { weight: w } });
      if (date === todayISO())
        await db.update(profiles).set({ currentWeight: w }).where(eq(profiles.id, userId));
      return `pesée enregistrée: ${w}kg le ${date}`;
    }

    default:
      return `outil inconnu: ${name}`;
  }
}
