import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Wraps a route handler: resolves the authenticated user id, returns 401 if
 * absent, and turns thrown errors into clean JSON responses.
 */
export function withAuth(
  handler: (userId: string, req: Request) => Promise<Response>,
) {
  return async (req: Request): Promise<Response> => {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
      }
      return await handler(user.id, req);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur serveur";
      console.error("[api]", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function ok<T>(data: T) {
  return NextResponse.json(data);
}
