import { GoogleGenAI } from "@google/genai";
import type {
  LLMProvider,
  ChatOptions,
  AnalyzeImageOptions,
  RunCoachOptions,
} from "./types";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey",
    );
  }
  return new GoogleGenAI({ apiKey });
}

export class GeminiProvider implements LLMProvider {
  async *chat(opts: ChatOptions): AsyncIterable<string> {
    const ai = getClient();

    const contents = opts.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const stream = await ai.models.generateContentStream({
      model: MODEL,
      contents,
      config: {
        systemInstruction: opts.system,
        temperature: opts.temperature ?? 0.7,
        maxOutputTokens: 800,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) yield text;
    }
  }

  async runCoach(opts: RunCoachOptions): Promise<string> {
    const ai = getClient();
    const maxSteps = opts.maxSteps ?? 5;

    // Build the running conversation.
    const contents: Array<{ role: string; parts: unknown[] }> = opts.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const config = {
      systemInstruction: opts.system,
      temperature: 0.6,
      maxOutputTokens: 1000,
      tools: [{ functionDeclarations: opts.tools }],
    };

    for (let step = 0; step < maxSteps; step++) {
      const res = await ai.models.generateContent({
        model: MODEL,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contents: contents as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        config: config as any,
      });

      const calls = res.functionCalls;
      if (calls && calls.length > 0) {
        // Record the model's tool-call turn.
        contents.push({
          role: "model",
          parts: calls.map((c) => ({ functionCall: { name: c.name, args: c.args ?? {} } })),
        });
        // Execute each call and feed results back.
        const responseParts: unknown[] = [];
        for (const c of calls) {
          let result: unknown;
          try {
            result = await opts.onToolCall(c.name ?? "", (c.args ?? {}) as Record<string, unknown>);
          } catch (err) {
            result = { error: err instanceof Error ? err.message : "tool error" };
          }
          responseParts.push({
            functionResponse: { name: c.name, response: { result } },
          });
        }
        contents.push({ role: "user", parts: responseParts });
        continue;
      }

      return res.text ?? "";
    }
    return "J'ai fait plusieurs ajustements — dis-moi si tu veux autre chose.";
  }

  async analyzeImage(opts: AnalyzeImageOptions): Promise<string> {
    const ai = getClient();

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: opts.mimeType, data: opts.imageBase64 } },
            { text: opts.prompt },
          ],
        },
      ],
      config: {
        temperature: 0.2,
        // Ask Gemini for JSON directly; we still parse defensively.
        responseMimeType: "application/json",
      },
    });

    return response.text ?? "";
  }
}
