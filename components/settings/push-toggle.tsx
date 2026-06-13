"use client";

import * as React from "react";
import { BellRing, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiSend } from "@/lib/client-api";
import { Button } from "@/components/ui/button";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  // Back it with a real ArrayBuffer so it satisfies BufferSource typing.
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushToggle() {
  const [supported, setSupported] = React.useState(true);
  const [standalone, setStandalone] = React.useState(true);
  const [subscribed, setSubscribed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      Boolean(VAPID_PUBLIC);
    setSupported(ok);

    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setStandalone(Boolean(isStandalone));

    if (ok) {
      navigator.serviceWorker.getRegistration().then((reg) =>
        reg?.pushManager.getSubscription().then((s) => setSubscribed(Boolean(s))),
      );
    }
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("Permission refusée.");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC!) as BufferSource,
      });
      const json = sub.toJSON();
      await apiSend("/api/push/subscribe", "POST", {
        endpoint: json.endpoint,
        keys: json.keys,
      });
      setSubscribed(true);
      toast.success("Notifications activées 🔔");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Activation impossible");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await apiSend(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, "DELETE");
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Notifications désactivées");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <p className="rounded-md bg-muted p-2.5 text-xs text-muted-foreground">
        Les notifications push ne sont pas disponibles sur ce navigateur (ou clés VAPID non
        configurées).
      </p>
    );
  }

  if (!standalone) {
    return (
      <p className="rounded-md bg-muted p-2.5 text-xs text-muted-foreground">
        Sur iPhone : ouvre l&apos;app dans Safari → <b>Partager</b> → <b>« Sur l&apos;écran
        d&apos;accueil »</b>, puis rouvre-la depuis l&apos;icône. Le bouton d&apos;activation
        apparaîtra ici.
      </p>
    );
  }

  return subscribed ? (
    <Button variant="outline" onClick={disable} disabled={busy} className="w-full">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
      Désactiver les notifications iPhone
    </Button>
  ) : (
    <Button onClick={enable} disabled={busy} className="w-full">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
      Activer les notifications iPhone
    </Button>
  );
}
