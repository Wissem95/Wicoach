import { z } from "zod";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { getChatHistory, countTodayUserMessages } from "@/db/queries";
import { withAuth, badRequest, ok } from "@/lib/api";
import { getLLM } from "@/lib/llm";
import { buildCoachContextPrompt } from "@/lib/coach";
import type { ChatTurn } from "@/lib/llm/types";

export const maxDuration = 60;

const DAILY_LIMIT = 50;

export const GET = withAuth(async (userId) => {
  return ok(await getChatHistory(userId));
});

const schema = z.object({ message: z.string().min(1).max(2000) });

export const POST = withAuth(async (userId, req) => {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return badRequest("Message vide ou trop long.");

  // Cheap daily cap to stay inside the free tier.
  const used = await countTodayUserMessages(userId);
  if (used >= DAILY_LIMIT) {
    return badRequest(`Limite quotidienne atteinte (${DAILY_LIMIT} messages). Reviens demain.`);
  }

  const userMessage = parsed.data.message.trim();

  // Persist the user's message, then build context (so today's data is fresh).
  await db.insert(chatMessages).values({ userId, role: "user", content: userMessage });

  const [system, history] = await Promise.all([
    buildCoachContextPrompt(userId),
    getChatHistory(userId, 20),
  ]);

  const turns: ChatTurn[] = history.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  const encoder = new TextEncoder();
  let full = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of getLLM().chat({ system, messages: turns })) {
          full += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur LLM";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
      } finally {
        // Save the assistant reply (fire-and-forget; the response is already streamed).
        if (full.trim()) {
          await db
            .insert(chatMessages)
            .values({ userId, role: "assistant", content: full.trim() })
            .catch((e) => console.error("[chat] save reply failed:", e));
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
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
