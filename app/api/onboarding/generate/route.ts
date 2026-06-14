import { z } from "zod";
import { withAuth, badRequest, ok } from "@/lib/api";
import { getLLM } from "@/lib/llm";
import { buildProgramGenerationPrompt } from "@/lib/llm/prompts";
import { coachToolDeclarations, executeCoachTool } from "@/lib/coach-actions";

export const maxDuration = 60;

const schema = z.object({ summary: z.string().min(10).max(8000) });

// Generates the full personalized program (meal menus + detailed sessions)
// from the onboarding profile, using the agentic coach + its write tools.
export const POST = withAuth(async (userId, req) => {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Profil manquant.");

  const now = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  }).format(new Date());

  try {
    const text = await getLLM().runCoach({
      system: buildProgramGenerationPrompt(now),
      messages: [{ role: "user", content: `PROFIL :\n${parsed.data.summary}` }],
      tools: coachToolDeclarations,
      onToolCall: (name, args) => executeCoachTool(userId, name, args),
      maxSteps: 10,
    });
    return ok({ ok: true, recap: text });
  } catch (err) {
    // Non-fatal: the user is already onboarded with targets + skeleton plan.
    console.error("[onboarding/generate]", err);
    return ok({ ok: false, error: err instanceof Error ? err.message : "generation failed" });
  }
});
