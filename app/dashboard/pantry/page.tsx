import { getPantry } from "@/db/queries";
import { requireUserId } from "@/lib/supabase/server";
import { PantryClient } from "@/components/pantry/pantry-client";

export const dynamic = "force-dynamic";

export default async function PantryPage() {
  const userId = await requireUserId();
  const items = await getPantry(userId);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Garde-manger</h1>
      <p className="text-sm text-muted-foreground">Ce que tu as à la maison.</p>
      <PantryClient
        initial={items.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity }))}
      />
    </div>
  );
}
