"use client";

import * as React from "react";
import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Speech-to-text via the browser's Web Speech API (free, no key).
// Renders nothing if the browser doesn't support it (the iOS keyboard mic
// still works as a fallback inside the text field).
export function VoiceButton({
  onText,
  onFinal,
  className,
}: {
  onText: (text: string) => void;
  onFinal?: (text: string) => void;
  className?: string;
}) {
  const [supported, setSupported] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const recRef = React.useRef<any>(null);

  React.useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) setSupported(true);
  }, []);

  function start() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "fr-FR";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let txt = "";
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      onText(txt);
      const last = e.results[e.results.length - 1];
      if (last && last.isFinal && onFinal) onFinal(txt.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  function stop() {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={() => (listening ? stop() : start())}
      aria-label={listening ? "Arrêter la dictée" : "Parler"}
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors",
        listening ? "animate-pulse border-destructive bg-destructive text-destructive-foreground" : "hover:bg-accent",
        className,
      )}
    >
      {listening ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
    </button>
  );
}
