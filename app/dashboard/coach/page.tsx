import { getChatHistory } from "@/db/queries";
import { requireUserId } from "@/lib/supabase/server";
import { CoachClient } from "@/components/coach/coach-client";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const userId = await requireUserId();
  const history = await getChatHistory(userId);

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Coach</h1>
      <CoachClient
        initial={history.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
