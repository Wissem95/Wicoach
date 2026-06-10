import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export { schema };

let instance: PostgresJsDatabase<typeof schema> | null = null;

function init(): PostgresJsDatabase<typeof schema> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.local.example to .env.local and fill it in.",
    );
  }
  // Supabase's transaction pooler does not support prepared statements,
  // so disable them. `max: 1` keeps us well under the free-tier cap.
  const client = postgres(connectionString, { prepare: false, max: 1 });
  return drizzle(client, { schema });
}

/**
 * Lazily-initialized Drizzle client. The connection is only opened on the
 * first query, so importing this module during `next build` never throws.
 */
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    if (!instance) instance = init();
    return Reflect.get(instance, prop, receiver);
  },
});
