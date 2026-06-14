/**
 * Runs a single ad-hoc SQL statement (from the SQL env var) against DATABASE_URL.
 * Used by the admin workflow for one-off operations (e.g. confirm a user).
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
const sqlText = process.env.SQL;
if (!url || !sqlText) {
  console.error("DATABASE_URL and SQL are required.");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, ssl: "require" });
try {
  const res = await sql.unsafe(sqlText);
  console.log("Rows affected/returned:", Array.isArray(res) ? res.length : res);
  if (Array.isArray(res) && res.length) console.log(JSON.stringify(res, null, 2));
  console.log("✓ SQL executed.");
} catch (err) {
  console.error("✗ SQL failed:", err.message ?? err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
