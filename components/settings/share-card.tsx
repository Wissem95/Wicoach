"use client";

import * as React from "react";
import { Share2, Download, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { apiGet } from "@/lib/client-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ShareCard() {
  const [copied, setCopied] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  async function exportPlan() {
    setExporting(true);
    try {
      const [profile, training, routine] = await Promise.all([
        apiGet<unknown>("/api/profile"),
        apiGet<unknown>("/api/training/plan"),
        apiGet<unknown>("/api/routine"),
      ]);
      const data = { exportedAt: new Date().toISOString(), profile, training, routine };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "wicoach-plan.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Plan exporté");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export impossible");
    } finally {
      setExporting(false);
    }
  }

  async function invite() {
    const url = window.location.origin;
    const text = "Rejoins-moi sur Wicoach, mon coach fitness & nutrition 💪";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Wicoach", text, url });
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Lien copié — partage-le !");
    } catch {
      toast.error("Copie impossible.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Share2 className="h-4 w-4 text-primary" /> Partage & export
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={exportPlan} disabled={exporting}>
          <Download className="h-4 w-4" /> Exporter mon plan
        </Button>
        <Button variant="outline" onClick={invite}>
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          Inviter un ami
        </Button>
      </CardContent>
    </Card>
  );
}
