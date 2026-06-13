"use client";

import * as React from "react";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMessageView } from "@/types";

const SUGGESTIONS = [
  "Qu'est-ce que je mange ce soir avec ce que j'ai ?",
  "J'ai pas pu aller à la salle aujourd'hui",
  "J'ai mal dormi cette nuit (moins de 7h)",
];

export function CoachClient({ initial }: { initial: ChatMessageView[] }) {
  const [messages, setMessages] = React.useState<ChatMessageView[]>(initial);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;

    const userMsg: ChatMessageView = {
      id: "u-" + Date.now(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    const assistantId = "a-" + Date.now();
    setMessages((m) => [
      ...m,
      userMsg,
      { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString() },
    ]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Le coach est indisponible.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
              m.map((msg) =>
                msg.id === assistantId ? { ...msg, content: msg.content + payload.text } : msg,
              ),
            );
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      toast.error(message);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantId && !msg.content
            ? { ...msg, content: `⚠️ ${message}` }
            : msg,
        ),
      );
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-15rem)] flex-col md:h-[calc(100dvh-11rem)]">
      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            Pose-moi une question. J&apos;ai tes chiffres du jour, ton garde-manger et ton plan
            d&apos;entraînement sous les yeux.
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "border bg-card text-card-foreground",
              )}
            >
              {m.content || (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {messages.length === 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
            >
              {s}
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
          placeholder="Écris au coach…"
          rows={1}
          className="max-h-32 min-h-[44px] resize-none"
        />
        <Button type="submit" size="icon" disabled={streaming || !input.trim()} aria-label="Envoyer">
          {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
