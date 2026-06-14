/**
 * Runs every numbered SQL migration via the Supabase Management API (HTTPS),
 * for environments where direct Postgres ports are blocked.
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx SUPABASE_PROJECT_REF=xxxx node scripts/migrate-api.mjs
 *
 * Token: https://supabase.com/dashboard/account/tokens (revoke it afterwards).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
if (!token || !ref) {
  console.error("SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF are required.");
  process.exit(1);
}

const endpoint = `https://api.supabase.com/v1/projects/${ref}/database/query`;
const dir = join(process.cwd(), "db", "migrations");
const files = readdirSync(dir)
  .filter((f) => /^\d{4}_.*\.sql$/.test(f))
  .sort();

let failed = false;
for (const f of files) {
  const query = readFileSync(join(dir, f), "utf8");
  process.stdout.write(`→ ${f} … `);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (res.ok) {
    console.log("ok");
  } else {
    failed = true;
    const body = await res.text();
    console.log(`FAILED (${res.status})`);
    console.error("   ", body.slice(0, 300));
  }
}
console.log(failed ? "\n✗ Some migrations failed." : "\n✓ All migrations applied.");
process.exit(failed ? 1 : 0);
