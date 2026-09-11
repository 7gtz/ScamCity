"use client";

import { Globe, Mail, MessageSquare, Phone } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCallStore } from "@/features/call/call-store";
import { cn } from "@/lib/cn";
import { fetchEmail, fetchSite, startChat } from "@/lib/encounters";
import type { RealWorldContext } from "@/lib/live/types";
import { duration, ease } from "@/lib/motion/tokens";
import { routeFor, useFreestyle, type Encounter } from "./freestyle-store";
import { startRing, stopRing } from "./ringtone";
import { firstDelay, goalFor, nextDelay, pickEncounter, type EncounterSpec } from "./schedule";

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
      // Messages needs the live AI; without it a website arrives instead (still a new channel).
      if (!chat) return prepare({ ...spec, channel: "web" }, ctx);
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
      store.setNextAt(Date.now() + (store.handled === 0 ? firstDelay(Math.random, store.pace) : nextDelay(store.pace)));
      return; // re-runs with nextAt set
    }
    const genuineSeen = store.log.filter((l) => l.legit).length;
    prepared ??= prepare(pickEncounter(store.handled, Math.random, { pace: store.pace, genuineSeen }), store.context);

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
const DISMISS = { call: "Decline", email: "Ignore", sms: "Ignore", web: "Ignore" } as const;
const KIND = { call: "Incoming call", email: "New email", sms: "New message", web: "Sponsored link" } as const;

/**
 * The in-app side of an arrival, drawn as an OS notification rather than a
 * site toast: app line, sender, preview, two actions, and a hairline that
 * runs out with the ring. Heads-up at the top on phones, bottom-right on desktop.
 * Counts as ignored after 30 s.
 */
function IncomingCard() {
  const incoming = useFreestyle((s) => s.incoming);
  const handled = useFreestyle((s) => s.handled);
  const pace = useFreestyle((s) => s.pace);
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
    if (!e) return;
    const url = routeFor(e);
    router.push(url);
    // Demo-critical: if the client router hasn't moved (a stuck transition, an
    // overlay swallowing it), load the encounter directly. Its state persists.
    const path = url.split("?")[0];
    setTimeout(() => {
      if (window.location.pathname !== path) window.location.assign(url);
    }, 5000);
  };
  const ignore = () => {
    stopRing();
    notification?.close();
    useFreestyle.getState().ignore();
  };

  const channel = incoming?.spec.channel ?? "call";
  const Icon = ICONS[channel];
  const call = channel === "call";

  return (
    <AnimatePresence>
      {incoming && (
        <motion.aside
          key={incoming.id}
          role="alertdialog"
          aria-label={`${KIND[channel]}: ${incoming.title}`}
          aria-describedby={`${incoming.id}-body`}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: reduced ? 0 : 12, transition: { duration: duration.ui * 0.6 } }}
          transition={{ duration: duration.ui, ease }}
          className="fixed inset-x-3 top-3 z-[88] sm:inset-x-auto sm:top-auto sm:right-5 sm:bottom-5 sm:w-[400px]"
        >
          <div
            className={cn(
              "overflow-hidden border border-line bg-raised shadow-[0_24px_64px_-24px_rgba(0,0,0,0.9)]",
              call && "buzz",
            )}
          >
            {/* The OS line: which app, when. */}
            <p className="meta flex items-center gap-2.5 px-4 pt-3 text-smoke">
              <span aria-hidden className="grid size-5 place-items-center bg-bone font-display text-[0.7rem] leading-none text-ink">
                S
              </span>
              <span className="text-ash">Scam City</span>
              <span>· now</span>
              <span className="ml-auto flex items-center gap-2">
                {pathname !== "/freestyle" && <span className="hidden sm:inline">Freestyle ·</span>}
                <span className="tabular">
                  {Math.min(handled + 1, goalFor(pace))}/{goalFor(pace)}
                </span>
              </span>
            </p>

            <div className="flex items-start gap-4 px-4 pt-4 pb-4">
              <span aria-hidden className="relative grid size-12 shrink-0 place-items-center">
                {call && !reduced && <span className="ring-wave !top-1/2 !w-16 [--hue-text:var(--color-signal)]" />}
                <span className={cn("grid size-12 place-items-center rounded-full", call ? "bg-signal text-ink" : "bg-surface text-bone")}>
                  <Icon strokeWidth={1.5} className="size-5" />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("meta flex items-center gap-2", call ? "text-signal" : "text-smoke")}>
                  {call && <span aria-hidden className="live-dot" />}
                  {KIND[channel]}
                </p>
                <p className="mt-1 truncate text-lg leading-snug font-semibold text-bone">{incoming.title}</p>
                <p id={`${incoming.id}-body`} className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-ash">
                  {incoming.body}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 border-t border-line">
              <button
                type="button"
                onClick={ignore}
                className="ui-label min-h-12 border-r border-line text-ash transition-colors duration-[180ms] hover:bg-surface hover:text-bone"
              >
                {DISMISS[channel]}
              </button>
              <button
                type="button"
                onClick={accept}
                autoFocus
                data-cursor="enter"
                className="ui-label min-h-12 bg-bone text-ink transition-colors duration-[180ms] hover:bg-ash"
              >
                {ACCEPT[channel]}
              </button>
            </div>

            {/* Runs out with the ring (30 s). Hidden under reduced motion, where it would jump to empty. */}
            <span
              aria-hidden
              className="block h-0.5 origin-left animate-[ring-out_30s_linear_forwards] bg-signal motion-reduce:hidden"
            />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
