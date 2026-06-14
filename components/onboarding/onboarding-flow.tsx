"use client";

import * as React from "react";
import { MessageCircle, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { OnboardingChat } from "@/components/onboarding/onboarding-chat";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export function OnboardingFlow() {
  const [mode, setMode] = React.useState<"chat" | "form">("chat");

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-extrabold">
          <span className="text-gradient">Wi</span>coach
        </div>
        <div className="flex rounded-full border p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode("chat")}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 font-medium",
              mode === "chat" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <MessageCircle className="h-3.5 w-3.5" /> Coach IA
          </button>
          <button
            type="button"
            onClick={() => setMode("form")}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 font-medium",
              mode === "form" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <ListChecks className="h-3.5 w-3.5" /> Formulaire
          </button>
        </div>
      </div>

      {mode === "chat" ? <OnboardingChat /> : <OnboardingWizard />}
    </div>
  );
}
