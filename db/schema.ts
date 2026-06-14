import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  real,
  boolean,
  date,
  timestamp,
  jsonb,
  smallint,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const mealTypeEnum = pgEnum("meal_type", [
  "petit_dej",
  "dejeuner",
  "diner",
  "snack",
]);

export const chatRoleEnum = pgEnum("chat_role", ["user", "assistant"]);

export const trainingTypeEnum = pgEnum("training_type", [
  "salle",
  "piscine",
  "maison",
  "repos",
]);

export const taskStatusEnum = pgEnum("task_status", ["todo", "doing", "done"]);

// ---------------------------------------------------------------------------
// profiles — 1 row per auth user
// ---------------------------------------------------------------------------
export const profiles = pgTable("profiles", {
  // references auth.users(id) — FK added in the SQL migration.
  id: uuid("id").primaryKey(),
  currentWeight: real("current_weight").notNull().default(100),
  targetWeight: real("target_weight").notNull().default(90),
  targetCalories: integer("target_calories").notNull().default(1500),
  targetProtein: integer("target_protein").notNull().default(110),
  targetCarbs: integer("target_carbs").notNull().default(80),
  targetFats: integer("target_fats").notNull().default(50),
  // Permanent "everything about me" memory injected into the coach prompt.
  coachNotes: text("coach_notes"),
  // Secret token used by the Apple Health Shortcut to push data in.
  ingestToken: uuid("ingest_token").notNull().defaultRandom(),
  emailReminders: boolean("email_reminders").notNull().default(true),
  pushEnabled: boolean("push_enabled").notNull().default(false),
  onboarded: boolean("onboarded").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// weight_logs — one pesée per day per user
// ---------------------------------------------------------------------------
export const weightLogs = pgTable(
  "weight_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    weight: real("weight").notNull(),
    loggedAt: date("logged_at").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("weight_logs_user_day_uq").on(t.userId, t.loggedAt),
    index("weight_logs_user_date_idx").on(t.userId, t.loggedAt),
    check("weight_logs_weight_range", sql`${t.weight} >= 40 AND ${t.weight} <= 250`),
    check("weight_logs_not_future", sql`${t.loggedAt} <= CURRENT_DATE`),
  ],
);

// ---------------------------------------------------------------------------
// meals
// ---------------------------------------------------------------------------
export const meals = pgTable(
  "meals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    mealType: mealTypeEnum("meal_type").notNull(),
    mealTime: timestamp("meal_time", { withTimezone: true }).notNull().defaultNow(),
    totalCalories: integer("total_calories").notNull().default(0),
    totalProtein: integer("total_protein").notNull().default(0),
    totalCarbs: integer("total_carbs").notNull().default(0),
    totalFats: integer("total_fats").notNull().default(0),
    photoUrl: text("photo_url"),
    aiAnalyzed: boolean("ai_analyzed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("meals_user_time_idx").on(t.userId, t.mealTime),
    check("meals_calories_range", sql`${t.totalCalories} >= 0 AND ${t.totalCalories} <= 10000`),
    check("meals_macros_nonneg", sql`${t.totalProtein} >= 0 AND ${t.totalCarbs} >= 0 AND ${t.totalFats} >= 0`),
    check("meals_time_not_future", sql`${t.mealTime} <= now()`),
  ],
);

// ---------------------------------------------------------------------------
// food_items — lines of a meal
// ---------------------------------------------------------------------------
export const foodItems = pgTable(
  "food_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mealId: uuid("meal_id").notNull(),
    foodName: text("food_name").notNull(),
    portion: real("portion").notNull().default(100),
    unit: text("unit").notNull().default("g"),
    calories: integer("calories").notNull().default(0),
    protein: integer("protein").notNull().default(0),
    carbs: integer("carbs").notNull().default(0),
    fats: integer("fats").notNull().default(0),
  },
  (t) => [
    index("food_items_meal_idx").on(t.mealId),
    check("food_items_macros_nonneg", sql`${t.calories} >= 0 AND ${t.protein} >= 0 AND ${t.carbs} >= 0 AND ${t.fats} >= 0`),
  ],
);

// ---------------------------------------------------------------------------
// favorite_meals — reusable templates
// ---------------------------------------------------------------------------
export const favoriteMeals = pgTable(
  "favorite_meals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    mealType: mealTypeEnum("meal_type").notNull().default("dejeuner"),
    items: jsonb("items").notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("favorite_meals_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// chat_messages
// ---------------------------------------------------------------------------
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    role: chatRoleEnum("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("chat_messages_user_created_idx").on(t.userId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// pantry_items — "ce que j'ai"
// ---------------------------------------------------------------------------
export const pantryItems = pgTable(
  "pantry_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    quantity: text("quantity"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pantry_items_user_idx").on(t.userId, t.addedAt)],
);

// ---------------------------------------------------------------------------
// training_plan — weekly template, 7 rows per user (day_of_week 0..6)
// ---------------------------------------------------------------------------
export const trainingPlan = pgTable(
  "training_plan",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    dayOfWeek: smallint("day_of_week").notNull(),
    // Open text so the coach can use any activity (course, vélo, yoga…).
    type: text("type").notNull().default("repos"),
    focus: text("focus"),
  },
  (t) => [
    uniqueIndex("training_plan_user_day_uq").on(t.userId, t.dayOfWeek),
    check("training_plan_day_range", sql`${t.dayOfWeek} >= 0 AND ${t.dayOfWeek} <= 6`),
  ],
);

// ---------------------------------------------------------------------------
// workout_logs
// ---------------------------------------------------------------------------
export const workoutLogs = pgTable(
  "workout_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    type: text("type").notNull(),
    focus: text("focus"),
    durationMinutes: integer("duration_minutes").notNull().default(0),
    completed: boolean("completed").notNull().default(true),
    notes: text("notes"),
    performedAt: date("performed_at").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("workout_logs_user_date_idx").on(t.userId, t.performedAt),
    check("workout_logs_duration_nonneg", sql`${t.durationMinutes} >= 0 AND ${t.durationMinutes} <= 1000`),
    check("workout_logs_not_future", sql`${t.performedAt} <= CURRENT_DATE`),
  ],
);

// ---------------------------------------------------------------------------
// steps_logs — optional manual field, one per day per user
// ---------------------------------------------------------------------------
export const stepsLogs = pgTable(
  "steps_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    steps: integer("steps").notNull(),
    loggedAt: date("logged_at").notNull(),
  },
  (t) => [
    uniqueIndex("steps_logs_user_day_uq").on(t.userId, t.loggedAt),
    check("steps_logs_nonneg", sql`${t.steps} >= 0 AND ${t.steps} <= 200000`),
    check("steps_logs_not_future", sql`${t.loggedAt} <= CURRENT_DATE`),
  ],
);

// ---------------------------------------------------------------------------
// sleep_logs — one night per day per user (from Apple Health or manual)
// ---------------------------------------------------------------------------
export const sleepLogs = pgTable(
  "sleep_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    hours: real("hours").notNull(),
    loggedAt: date("logged_at").notNull(),
  },
  (t) => [
    uniqueIndex("sleep_logs_user_day_uq").on(t.userId, t.loggedAt),
    check("sleep_logs_range", sql`${t.hours} >= 0 AND ${t.hours} <= 24`),
    check("sleep_logs_not_future", sql`${t.loggedAt} <= CURRENT_DATE`),
  ],
);

// ---------------------------------------------------------------------------
// push_subscriptions — Web Push endpoints (PWA on iOS)
// ---------------------------------------------------------------------------
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("push_subscriptions_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// tasks — calendar checklist (todo / doing / done) per day
// ---------------------------------------------------------------------------
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    title: text("title").notNull(),
    status: taskStatusEnum("status").notNull().default("todo"),
    dueDate: date("due_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tasks_user_due_idx").on(t.userId, t.dueDate)],
);

// ---------------------------------------------------------------------------
// custom_alerts — user-defined timed reminders (wake-up, prayer, supplements…)
// ---------------------------------------------------------------------------
export const customAlerts = pgTable(
  "custom_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    label: text("label").notNull(),
    atTime: text("at_time").notNull(), // "HH:MM" Europe/Paris
    days: text("days"), // "0,1,..6" (0=Sun); null = every day
    channel: text("channel").notNull().default("push"), // push | email | both
    enabled: boolean("enabled").notNull().default(true),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("custom_alerts_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// routine_items — daily routine template (wake-up, meals, supplements…)
// ---------------------------------------------------------------------------
export const routineItems = pgTable(
  "routine_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    label: text("label").notNull(),
    atTime: text("at_time"), // "HH:MM" optional
    sort: integer("sort").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("routine_items_user_idx").on(t.userId, t.sort)],
);

// ---------------------------------------------------------------------------
// routine_checks — which routine items were ticked, per day
// ---------------------------------------------------------------------------
export const routineChecks = pgTable(
  "routine_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    itemId: uuid("item_id").notNull(),
    day: date("day").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("routine_checks_uq").on(t.userId, t.itemId, t.day),
    index("routine_checks_user_day_idx").on(t.userId, t.day),
  ],
);

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type Profile = typeof profiles.$inferSelect;
export type WeightLog = typeof weightLogs.$inferSelect;
export type Meal = typeof meals.$inferSelect;
export type FoodItem = typeof foodItems.$inferSelect;
export type FavoriteMeal = typeof favoriteMeals.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type PantryItem = typeof pantryItems.$inferSelect;
export type TrainingPlanRow = typeof trainingPlan.$inferSelect;
export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type StepsLog = typeof stepsLogs.$inferSelect;
export type SleepLog = typeof sleepLogs.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type CustomAlert = typeof customAlerts.$inferSelect;
export type RoutineItem = typeof routineItems.$inferSelect;
export type RoutineCheck = typeof routineChecks.$inferSelect;
