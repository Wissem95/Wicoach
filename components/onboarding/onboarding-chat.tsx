"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceButton } from "@/components/voice-button";
import type { ChatMessageView } from "@/types";

const GREETING =
  "Salut 👋 Je suis ton coach Wicoach. En quelques messages je vais te configurer un programme sur-mesure. Pour commencer : c'est quoi ton objectif principal ?";

const GOALS = ["Perdre du poids", "Courir un marathon", "Prendre du muscle", "Être en forme / santé"];

export function OnboardingChat() {
  const router = useRouter();
  const [messages, setMessages] = React.useState<ChatMessageView[]>([
    { id: "greeting", role: "assistant", content: GREETING, createdAt: new Date().toISOString() },
  ]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;

    const priorTurns = messages
      .filter((m) => m.id !== "greeting" && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content }));
    const turns = [...priorTurns, { role: "user" as const, content }];

    const assistantId = "a-" + Date.now();
    setMessages((m) => [
      ...m,
      { id: "u-" + Date.now(), role: "user", content, createdAt: new Date().toISOString() },
      { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString() },
    ]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/onboarding/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: turns }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Coach indisponible");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const payload = JSON.parse(line.slice(5).trim());
          if (payload.error) throw new Error(payload.error);
          if (payload.text) {
            setMessages((m) =>
              m.map((msg) => (msg.id === assistantId ? { ...msg, content: msg.content + payload.text } : msg)),
            );
          }
          if (payload.done && payload.onboarded) finished = true;
        }
      }

      if (finished) {
        toast.success("Ton programme est prêt ! 🎉");
        setTimeout(() => {
          router.replace("/dashboard");
          router.refresh();
        }, 1400);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm",
                m.role === "user" ? "bg-primary text-primary-foreground" : "border bg-card",
              )}
            >
              {m.content || <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {messages.length === 1 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => send(g)}
              className="inline-flex items-center gap-1 rounded-full border bg-card px-3 py-1.5 text-xs hover:bg-accent"
            >
              <Sparkles className="h-3 w-3 text-primary" /> {g}
            </button>
          ))}
        </div>
      )}

      <form
        className="flex items-end gap-2 border-t bg-background pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Réponds au coach… (ou parle 🎤)"
          rows={1}
          className="max-h-32 min-h-[44px] resize-none"
        />
        <VoiceButton onText={setInput} onFinal={(t) => t && send(t)} />
        <Button type="submit" size="icon" disabled={streaming || !input.trim()} aria-label="Envoyer">
          {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
