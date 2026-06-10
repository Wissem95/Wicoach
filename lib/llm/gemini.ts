import { GoogleGenAI } from "@google/genai";
import type {
  LLMProvider,
  ChatOptions,
  AnalyzeImageOptions,
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
