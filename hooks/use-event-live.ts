"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Snapshot } from "@/lib/contracts";
import { api } from "@/lib/api-client";

export function useEventLive(eventId: string) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [connection, setConnection] = useState<"connecting" | "live" | "reconnecting" | "offline">("connecting");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const lastHeartbeat = useRef(0);
  const accept = useCallback((data: Snapshot) => {
    setSnapshot(current => current?.event.id === data.event.id && current.event.revision > data.event.revision ? current : data);
    setLastSync(data.serverTime);
  }, []);
  const refresh = useCallback(async () => {
    if (!eventId) return;
    const data = await api<Snapshot>(`/api/events/${eventId}/snapshot`);
    accept(data);
    return data;
  }, [eventId, accept]);
  useEffect(() => {
    if (!eventId) return;
    let alive = true;
    const stream = new EventSource(`/api/events/${eventId}/live`);
    function heartbeat() { lastHeartbeat.current = Date.now(); if (alive) setConnection("live"); }
    stream.addEventListener("snapshot", event => { if (alive) { accept(JSON.parse((event as MessageEvent).data)); heartbeat(); } });
    stream.addEventListener("heartbeat", event => { heartbeat(); if (alive) setLastSync(JSON.parse((event as MessageEvent).data).at); });
    stream.addEventListener("unavailable", () => { if (alive) setConnection("reconnecting"); });
    stream.onerror = () => { if (alive) setConnection(navigator.onLine ? "reconnecting" : "offline"); };
    const fallback = async () => {
      if (!navigator.onLine) { if (alive) setConnection("offline"); return; }
      if (Date.now() - lastHeartbeat.current < 8000) return;
      try { const data = await api<Snapshot>(`/api/events/${eventId}/snapshot`); if (alive) { accept(data); setConnection("reconnecting"); } }
      catch { if (alive) setConnection("offline"); }
    };
    const interval = setInterval(fallback, 10000);
    const offline = () => setConnection("offline");
    window.addEventListener("offline", offline);
    window.addEventListener("online", fallback);
    window.addEventListener("focus", fallback);
    return () => { alive = false; stream.close(); clearInterval(interval); window.removeEventListener("offline", offline); window.removeEventListener("online", fallback); window.removeEventListener("focus", fallback); };
  }, [eventId, accept]);
  return { data: snapshot?.event.id === eventId ? snapshot : null, connection, lastSync, refresh };
}
