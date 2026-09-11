"use client";

import { Globe, Mail, MessageSquare, Phone } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { useCallStore } from "@/features/call/call-store";
import { fetchEmail, fetchSite, startChat } from "@/lib/encounters";
import type { RealWorldContext } from "@/lib/live/types";
import { duration, ease } from "@/lib/motion/tokens";
import { routeFor, useFreestyle, type Encounter } from "./freestyle-store";
import { startRing, stopRing } from "./ringtone";
import { firstDelay, nextDelay, pickEncounter, type EncounterSpec } from "./schedule";

/** How long an encounter waits for the player before it counts as ignored. */
const RING_OUT_MS = 30_000;
const BUSY = new Set(["permission-requested", "connecting", "ringing", "live", "ending", "scoring"]);

/** Prepared ahead of time so the content is ready the moment it's due. */
let prepared: Promise<Encounter | null> | null = null;
let notification: Notification | null = null;

function unknownNumber(ctx: RealWorldContext | null) {
  const d = () => Math.floor(Math.random() * 10);
  if (ctx?.timezone === "Asia/Kolkata" || ctx?.timezone === "Asia/Calcutta" || ctx?.country === "India") {
    return `+91 9${d()}${d()}${d()}${d()} ${d()}${d()}${d()}${d()}${d()}`;
  }
  return "Unknown number";
}

async function prepare(spec: EncounterSpec, ctx: RealWorldContext | null): Promise<Encounter | null> {
  const id = crypto.randomUUID();
  const opts = { difficulty: spec.difficulty, wantLegit: spec.legit };
  switch (spec.channel) {
    case "call":
      return { id, spec, title: "Incoming call", body: `${unknownNumber(ctx)} · Mobile` };
    case "email": {
      const email = await fetchEmail(opts);
      return { id, spec: { ...spec, legit: !email.scam }, title: `New email · ${email.fromName}`, body: email.subject, email };
    }
    case "sms": {
      const chat = await startChat(opts);
      // Messages needs the live AI; without it an email arrives instead.
      if (!chat) return prepare({ ...spec, channel: "email" }, ctx);
      return {
        id,
        spec: { ...spec, legit: !chat.plan.scam },
        title: `${chat.plan.contactLabel} · ${chat.plan.platform}`,
        body: chat.plan.opening,
        chat,
      };
    }
    case "web": {
      const site = await fetchSite(opts);
      return { id, spec: { ...spec, legit: !site.scam }, title: `Sponsored · ${site.brand}`, body: `${site.headline} — ${site.domain}`, site };
    }
  }
}

function notify(e: Encounter) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  notification?.close();
  try {
    notification = new Notification(e.title, { body: e.body, tag: "scam-city", requireInteraction: true });
    // The click brings the tab forward; answering happens on the in-app card (a real gesture, so audio works).
    notification.onclick = () => {
      window.focus();
      notification?.close();
    };
  } catch {
    notification = null;
  }
}

/**
 * Freestyle's clock. Lives in the global chrome, so encounters keep arriving
 * while the player browses any page of the site (or another tab, via desktop
 * notifications). Pauses while an encounter is being played.
 */
export function FreestyleEngine() {
  const status = useFreestyle((s) => s.status);
  const incoming = useFreestyle((s) => s.incoming);
  const current = useFreestyle((s) => s.current);
  const nextAt = useFreestyle((s) => s.nextAt);
  const onCall = useCallStore((s) => BUSY.has(s.status));

  useEffect(() => {
    if (status !== "active") {
      prepared = null;
      return;
    }
    if (incoming || current || onCall) return;

    const store = useFreestyle.getState();
    if (!store.nextAt) {
      store.setNextAt(Date.now() + (store.handled === 0 ? firstDelay() : nextDelay(store.pace)));
      return; // re-runs with nextAt set
    }
    prepared ??= prepare(pickEncounter(store.handled), store.context);

    const timer = setTimeout(async () => {
      const encounter = await prepared;
      prepared = null;
      const s = useFreestyle.getState();
      if (s.status !== "active" || s.incoming || s.current) return;
      if (!encounter) {
        s.setNextAt(null);
        return;
      }
      s.ring(encounter);
      notify(encounter);
    }, Math.max(0, store.nextAt - Date.now()));
    return () => clearTimeout(timer);
  }, [status, incoming, current, onCall, nextAt]);

  return <IncomingCard />;
}

const ICONS = { call: Phone, email: Mail, sms: MessageSquare, web: Globe } as const;
const ACCEPT = { call: "Answer", email: "Open", sms: "Reply", web: "Visit" } as const;
const KIND = { call: "Incoming call", email: "New email", sms: "New message", web: "Link" } as const;

/** The in-app side of an arrival: rings, then counts as ignored after 30 s. */
function IncomingCard() {
  const incoming = useFreestyle((s) => s.incoming);
  const router = useRouter();
  const pathname = usePathname();
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!incoming) return;
    if (incoming.spec.channel === "call") startRing();
    const timer = setTimeout(() => {
      stopRing();
      notification?.close();
      useFreestyle.getState().ignore();
    }, RING_OUT_MS);
    return () => {
      clearTimeout(timer);
      stopRing();
    };
  }, [incoming]);

  const accept = () => {
    stopRing();
    notification?.close();
    const e = useFreestyle.getState().accept();
    if (e) router.push(routeFor(e));
  };
  const ignore = () => {
    stopRing();
    notification?.close();
    useFreestyle.getState().ignore();
  };

  const Icon = incoming ? ICONS[incoming.spec.channel] : Phone;

  return (
    <AnimatePresence>
      {incoming && (
        <motion.aside
          key={incoming.id}
          role="alertdialog"
          aria-label={`${KIND[incoming.spec.channel]}: ${incoming.title}`}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : 16, transition: { duration: duration.ui * 0.6 } }}
          transition={{ duration: duration.ui, ease }}
          className="fixed inset-x-4 bottom-4 z-[88] border border-line bg-raised p-5 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[380px]"
        >
          <p className="meta flex items-center gap-3 text-ash">
            <span aria-hidden className="live-dot" />
            <Icon aria-hidden strokeWidth={1.25} className="size-4" />
            {KIND[incoming.spec.channel]}
            {pathname !== "/freestyle" && <span className="ml-auto text-smoke">Freestyle</span>}
          </p>
          <p className="mt-3 font-display text-2xl leading-tight tracking-[-0.01em]">{incoming.title}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ash">{incoming.body}</p>
          <div className="mt-5 flex gap-3">
            <Button size="md" onClick={accept} className="flex-1" autoFocus data-cursor="enter">
              {ACCEPT[incoming.spec.channel]}
            </Button>
            <Button size="md" variant="ghost" onClick={ignore} className="flex-1">
              Ignore
            </Button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
