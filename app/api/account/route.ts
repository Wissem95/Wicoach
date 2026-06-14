import { withAuth, ok } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

// Permanently deletes the user (cascades all their data via FK on auth.users).
export const DELETE = withAuth(async (userId) => {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  return ok({ ok: true });
});
