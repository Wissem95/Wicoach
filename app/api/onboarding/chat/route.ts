import { z } from "zod";
import { withAuth, badRequest } from "@/lib/api";
import { getLLM } from "@/lib/llm";
import { buildOnboardingSystemPrompt } from "@/lib/llm/prompts";
import { onboardingToolDeclarations, executeCoachTool } from "@/lib/coach-actions";
import type { ChatTurn } from "@/lib/llm/types";

export const maxDuration = 60;

const schema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(40),
});

export const POST = withAuth(async (userId, req) => {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Conversation invalide.");

  const now = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date());

  const system = buildOnboardingSystemPrompt(now);
  const messages: ChatTurn[] = parsed.data.messages;

  let onboarded = false;
  const onToolCall = (name: string, args: Record<string, unknown>) => {
    if (name === "complete_onboarding") onboarded = true;
    return executeCoachTool(userId, name, args);
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let full = "";
      try {
        full = await getLLM().runCoach({
          system,
          messages,
          tools: onboardingToolDeclarations,
          onToolCall,
          maxSteps: 6,
        });
        for (const w of full.split(/(\s+)/)) {
          if (w) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: w })}\n\n`));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur LLM";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
      } finally {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, onboarded })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
});
