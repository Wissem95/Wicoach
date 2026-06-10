import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // We manage RLS policies + auth schema references with raw SQL,
  // so let drizzle-kit ignore the Supabase-managed `auth` schema.
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
});
