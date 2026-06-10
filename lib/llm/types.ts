// Provider-agnostic LLM interface.
// Swap Gemini for Groq / DeepSeek / OpenRouter by adding a new impl that
// satisfies LLMProvider — nothing else in the app needs to change.

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  system: string;
  messages: ChatTurn[];
  temperature?: number;
}

export interface AnalyzeImageOptions {
  prompt: string;
  imageBase64: string;
  mimeType: string;
}

export interface LLMProvider {
  /** Streams the assistant reply as text chunks. */
  chat(opts: ChatOptions): AsyncIterable<string>;
  /** Returns the raw model text (expected to be JSON for vision). */
  analyzeImage(opts: AnalyzeImageOptions): Promise<string>;
}
