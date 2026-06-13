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

// A tool the coach can call to modify the user's data.
export interface ToolDeclaration {
  name: string;
  description: string;
  // JSON-schema-ish object (types in UPPERCASE: OBJECT/STRING/NUMBER/INTEGER/BOOLEAN/ARRAY).
  parameters: Record<string, unknown>;
}

export interface RunCoachOptions {
  system: string;
  messages: ChatTurn[];
  tools: ToolDeclaration[];
  /** Executes a tool call server-side and returns a short result. */
  onToolCall: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  maxSteps?: number;
}

export interface LLMProvider {
  /** Streams the assistant reply as text chunks. */
  chat(opts: ChatOptions): AsyncIterable<string>;
  /** Returns the raw model text (expected to be JSON for vision). */
  analyzeImage(opts: AnalyzeImageOptions): Promise<string>;
  /** Agentic loop with tool-use; returns the final assistant text. */
  runCoach(opts: RunCoachOptions): Promise<string>;
}
