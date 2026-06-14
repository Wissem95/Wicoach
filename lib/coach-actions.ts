import { and, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  profiles,
  trainingPlan,
  pantryItems,
  favoriteMeals,
  weightLogs,
  meals,
  foodItems,
  workoutLogs,
  sleepLogs,
  stepsLogs,
  tasks,
  routineItems,
  customAlerts,
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
        type: {
          type: "STRING",
          description:
            "N'importe quel type d'activité, en un mot minuscule : salle, maison, piscine, course, velo, marche, yoga, crossfit, cardio, repos…",
        },
        focus: { type: "STRING", description: "Détail optionnel (ex: Sortie longue 12 km)" },
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
  {
    name: "log_meal",
    description:
      "Enregistre un repas RÉELLEMENT consommé par l'utilisateur dans son journal du jour (compteur kcal/macros). À utiliser dès qu'il dit avoir mangé quelque chose.",
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
    name: "log_workout",
    description: "Enregistre une séance réalisée (ou non) par l'utilisateur aujourd'hui.",
    parameters: {
      type: "OBJECT",
      properties: {
        type: { type: "STRING", description: "Type d'activité (salle, course, velo, yoga, maison, piscine…)" },
        focus: { type: "STRING" },
        duration_minutes: { type: "INTEGER" },
        completed: { type: "BOOLEAN", description: "true = faite, false = pas faite" },
        notes: { type: "STRING" },
      },
      required: ["type"],
    },
  },
  {
    name: "log_sleep",
    description: "Enregistre la durée de sommeil (en heures) d'une nuit.",
    parameters: {
      type: "OBJECT",
      properties: {
        hours: { type: "NUMBER" },
        date: { type: "STRING", description: "YYYY-MM-DD, défaut aujourd'hui" },
      },
      required: ["hours"],
    },
  },
  {
    name: "log_steps",
    description: "Enregistre le nombre de pas d'une journée.",
    parameters: {
      type: "OBJECT",
      properties: {
        steps: { type: "INTEGER" },
        date: { type: "STRING", description: "YYYY-MM-DD, défaut aujourd'hui" },
      },
      required: ["steps"],
    },
  },
  {
    name: "add_task",
    description: "Ajoute une tâche au calendrier (par défaut aujourd'hui).",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        due_date: { type: "STRING", description: "YYYY-MM-DD, défaut aujourd'hui" },
      },
      required: ["title"],
    },
  },
  {
    name: "add_routine_item",
    description: "Ajoute un élément récurrent à la routine quotidienne (checklist du jour).",
    parameters: {
      type: "OBJECT",
      properties: {
        label: { type: "STRING" },
        at_time: { type: "STRING", description: "HH:MM optionnel" },
      },
      required: ["label"],
    },
  },
  {
    name: "add_alert",
    description: "Crée une alerte/rappel programmé (réveil, compléments, hydratation…).",
    parameters: {
      type: "OBJECT",
      properties: {
        label: { type: "STRING" },
        at_time: { type: "STRING", description: "HH:MM (24h)" },
        channel: { type: "STRING", description: "push | email | both (défaut both)" },
      },
      required: ["label", "at_time"],
    },
  },
];

// complete_onboarding is only offered during the onboarding conversation.
export const onboardingToolDeclarations: ToolDeclaration[] = [
  ...coachToolDeclarations,
  {
    name: "complete_onboarding",
    description:
      "À appeler UNIQUEMENT à la fin de l'onboarding, une fois les cibles, le plan d'entraînement et la routine configurés. Marque la configuration comme terminée.",
    parameters: { type: "OBJECT", properties: {} },
  },
];

// ---- Executor ------------------------------------------------------------
const MEAL_TYPES = ["petit_dej", "dejeuner", "diner", "snack"] as const;

// Normalize a free-form activity type to a single lowercase token.
function normType(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

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
      const type = normType(args.type);
      if (dow < 0 || dow > 6 || !type) return "paramètres invalides";
      const focus = type === "repos" ? null : args.focus ? String(args.focus).trim() : null;
      await db
        .insert(trainingPlan)
        .values({ userId, dayOfWeek: dow, type, focus })
        .onConflictDoUpdate({
          target: [trainingPlan.userId, trainingPlan.dayOfWeek],
          set: { type, focus },
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

    case "log_meal": {
      const mealName = String(args.name ?? "").trim();
      const rawType = String(args.meal_type ?? "");
      const mealType = MEAL_TYPES.includes(rawType as never)
        ? rawType
        : rawType === "collation"
          ? "snack"
          : "dejeuner";
      const rawItems = Array.isArray(args.items) ? args.items : [];
      const items = rawItems.map((it) => {
        const o = it as Record<string, unknown>;
        return {
          food_name: String(o.food_name ?? "Aliment"),
          portion: num(o.portion) ?? 100,
          calories: Math.round(num(o.calories) ?? 0),
          protein: Math.round(num(o.protein) ?? 0),
          carbs: Math.round(num(o.carbs) ?? 0),
          fats: Math.round(num(o.fats) ?? 0),
        };
      });
      if (!mealName || items.length === 0) return "nom + aliments requis";
      const totals = items.reduce(
        (a, i) => ({
          calories: a.calories + i.calories,
          protein: a.protein + i.protein,
          carbs: a.carbs + i.carbs,
          fats: a.fats + i.fats,
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 },
      );
      const [meal] = await db
        .insert(meals)
        .values({
          userId,
          name: mealName,
          mealType: mealType as never,
          mealTime: new Date(),
          totalCalories: Math.min(10000, totals.calories),
          totalProtein: totals.protein,
          totalCarbs: totals.carbs,
          totalFats: totals.fats,
          aiAnalyzed: true,
        })
        .returning();
      await db.insert(foodItems).values(
        items.map((i) => ({
          mealId: meal.id,
          foodName: i.food_name,
          portion: i.portion,
          unit: "g",
          calories: i.calories,
          protein: i.protein,
          carbs: i.carbs,
          fats: i.fats,
        })),
      );
      return `repas loggé: ${mealName} (${totals.calories} kcal, P${totals.protein}/G${totals.carbs}/L${totals.fats})`;
    }

    case "log_workout": {
      const type = normType(args.type);
      if (!type) return "type invalide";
      const dur = Math.max(0, Math.min(1000, Math.trunc(num(args.duration_minutes) ?? 0)));
      const completed = args.completed === false ? false : true;
      await db.insert(workoutLogs).values({
        userId,
        type,
        focus: args.focus ? String(args.focus).trim() : null,
        durationMinutes: dur,
        completed,
        notes: args.notes ? String(args.notes).trim() : null,
        performedAt: todayISO(),
      });
      return `séance loggée: ${type} ${dur}min (${completed ? "faite" : "pas faite"})`;
    }

    case "log_sleep": {
      const h = num(args.hours);
      if (h === null || h < 0 || h > 24) return "heures invalides";
      const date = dateArg(args.date);
      await db
        .insert(sleepLogs)
        .values({ userId, hours: h, loggedAt: date })
        .onConflictDoUpdate({ target: [sleepLogs.userId, sleepLogs.loggedAt], set: { hours: h } });
      return `sommeil loggé: ${h}h le ${date}`;
    }

    case "log_steps": {
      const s = num(args.steps);
      if (s === null || s < 0) return "pas invalides";
      const date = dateArg(args.date);
      const steps = Math.round(s);
      await db
        .insert(stepsLogs)
        .values({ userId, steps, loggedAt: date })
        .onConflictDoUpdate({ target: [stepsLogs.userId, stepsLogs.loggedAt], set: { steps } });
      return `pas loggés: ${steps} le ${date}`;
    }

    case "add_task": {
      const title = String(args.title ?? "").trim();
      if (!title) return "titre requis";
      const date = dateArg(args.due_date);
      await db.insert(tasks).values({ userId, title, dueDate: date });
      return `tâche ajoutée: ${title} (${date})`;
    }

    case "add_routine_item": {
      const label = String(args.label ?? "").trim();
      if (!label) return "label requis";
      const at =
        typeof args.at_time === "string" && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(args.at_time)
          ? args.at_time
          : null;
      await db.insert(routineItems).values({ userId, label, atTime: at, sort: 999 });
      return `routine: ajouté ${label}`;
    }

    case "add_alert": {
      const label = String(args.label ?? "").trim();
      const at = String(args.at_time ?? "");
      if (!label || !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(at)) return "label + heure HH:MM requis";
      const channel = ["push", "email", "both"].includes(String(args.channel))
        ? String(args.channel)
        : "both";
      await db.insert(customAlerts).values({ userId, label, atTime: at, channel });
      return `alerte créée: ${label} à ${at}`;
    }

    case "complete_onboarding": {
      await db.update(profiles).set({ onboarded: true, updatedAt: new Date() }).where(eq(profiles.id, userId));
      return "onboarding terminé";
    }

    default:
      return `outil inconnu: ${name}`;
  }
}

function dateArg(v: unknown): string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && v <= todayISO() ? v : todayISO();
}
