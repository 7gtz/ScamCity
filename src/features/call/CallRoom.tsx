"use client";

import { Mic, MicOff, Phone, PhoneOff, SendHorizontal } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Portrait } from "@/components/motion/Portrait";
import { RingTimer } from "@/components/sections/RingTimer";
import { Button } from "@/components/ui/Button";
import { Meter } from "@/components/ui/Meter";
import { TacticChip } from "@/components/ui/TacticChip";
import { BONUS, DISTRICTS, type District } from "@/content/districts";
import { Lives } from "@/features/freestyle/DayHud";
import { useFreestyle } from "@/features/freestyle/freestyle-store";
import { goalFor } from "@/features/freestyle/schedule";
import { startRing, stopRing, unlockRingtone } from "@/features/freestyle/ringtone";
import { useProgressStore } from "@/features/progress/progress-store";
import { JudgingProgress } from "@/features/scoring/JudgingProgress";
import { fmt } from "@/features/scoring/mock-judge";
import { useAiStatus } from "@/lib/ai-status";
import { cn } from "@/lib/cn";
import { mockForced } from "@/lib/live/provider";
import { describeContext } from "@/lib/live/real-world";
import type { CallStatus, ScammerPersona } from "@/lib/live/types";
import { duration, ease } from "@/lib/motion/tokens";
import { useCallStore } from "./call-store";
import { useLiveCall } from "./use-live-call";
import { Waveform } from "./Waveform";

type Props = { scenarioId: string; persona: ScammerPersona };

const ON_CALL: CallStatus[] = ["ringing", "live", "ending", "scoring"];

/**
 * The flagship call room (pages/call-room.md). Darker than the marketing site
 * on purpose: an operating environment. Each district rings in its own light,
 * with its own caller ID and pretext, before a word is said.
 */
export function CallRoom({ scenarioId, persona: districtPersona }: Props) {
  const { answer, choose, sendText, hangUp, toggleMute } = useLiveCall(scenarioId);
  const status = useCallStore((s) => s.status);
  // In a live call the director writes a new caller each time.
  const caller = useCallStore((s) => s.caller);
  const persona = useMemo(
    () => (caller ? { ...districtPersona, ...caller, portrait: undefined } : districtPersona),
    [caller, districtPersona],
  );
  const muted = useCallStore((s) => s.muted);
  // Off until the player chooses it: personalising with real location is an explicit decision.
  const [precise, setPrecise] = useState(false);
  const district = DISTRICTS.find((d) => d.id === districtPersona.district) ?? DISTRICTS[0]!;
  const bonus = scenarioId === BONUS.scenarioId;
  const idle = status === "idle";
  const onCall = ON_CALL.includes(status);
  const level = `${bonus ? "Bonus call · The legitimate call" : `District ${district.number} · ${district.title}`} · Channel · Call`;

  // Freestyle answers for you: the player already pressed Answer on the incoming card.
  const autoAnswered = useRef(false);
  useEffect(() => {
    if (autoAnswered.current || new URLSearchParams(window.location.search).get("auto") !== "1") return;
    autoAnswered.current = true;
    void answer({ precise: useFreestyle.getState().context?.source === "gps" });
  }, [answer]);

  // The phone rings (and buzzes) until you answer. Browsers allow sound only
  // after a gesture; arriving here by a click counts, a cold page load doesn't.
  useEffect(() => {
    if (!idle || new URLSearchParams(window.location.search).get("auto") === "1") return;
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (!activation?.hasBeenActive) return;
    unlockRingtone();
    startRing();
    try {
      navigator.vibrate?.([400, 200, 400]);
    } catch {
      /* not supported */
    }
    const quiet = setTimeout(stopRing, 24_000);
    return () => {
      clearTimeout(quiet);
      stopRing();
    };
  }, [idle]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.target instanceof HTMLInputElement) return;
      if (e.key === "m" || e.key === "M") toggleMute();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleMute]);

  return (
    // Always exactly one screen tall: the transcript scrolls inside, so the
    // reply box and controls stay in view on every device.
    <div
      style={{ "--hue": district.hue, "--hue-text": district.hueText } as React.CSSProperties}
      className="flex h-dvh flex-col overflow-hidden bg-ink"
    >
      <Hud level={level} status={status} />
      {onCall && <PressureLine />}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-12">
        <section
          aria-label={onCall ? `${persona.name}, ${persona.role}, ${persona.organization}` : "Incoming caller"}
          className={cn(
            "relative shrink-0 overflow-hidden bg-ember lg:col-span-5 lg:h-auto",
            onCall ? "h-[22dvh] sm:h-[30dvh]" : "h-[26dvh] sm:h-[34dvh]",
          )}
        >
          {/* Ringing: an unknown silhouette in the district's light, buzzing. On the call: the caller, pulsing with their real voice. */}
          <Portrait
            src={persona.portrait}
            alt={onCall ? `${persona.name}, the caller` : "Unknown caller"}
            name={onCall ? persona.name : "Unknown number"}
            subject={onCall ? "Caller" : "Incoming"}
            trigger="load"
            kenBurns={false}
            priority
            reactive={status === "live"}
            tint={district.hueText}
            sizes="(min-width: 1024px) 42vw, 100vw"
            className={cn("absolute inset-0", idle && "buzz")}
          />
          {idle && <RingWaves />}
          {onCall && <SpeakerLine />}
        </section>

        <section className={cn("gutter-x flex min-h-0 flex-col py-5 lg:col-span-7 lg:py-10", !onCall && "overflow-y-auto")}>
          {idle && (
            <Incoming
              district={district}
              bonus={bonus}
              precise={precise}
              onPrecise={setPrecise}
              onAnswer={() => answer({ precise })}
            />
          )}
          {status === "permission-requested" && <Permission />}
          {status === "connecting" && <Connecting org={bonus ? district.org : district.org} />}
          {status === "error" && (
            <Dropped onRetry={() => answer({ precise })} onScripted={() => answer({ precise: false, forceMock: true })} />
          )}
          {onCall && <Conversation persona={persona} status={status} onChoose={choose} onSend={sendText} />}
        </section>
      </div>

      {onCall && <Controls muted={muted} status={status} onMute={toggleMute} onEnd={hangUp} />}
      <Announcer level={level} />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Pressure: how hard the caller is pushing right now (escalation + tactics in play).

const usePressure = () =>
  useCallStore((s) => {
    const a = s.agent;
    if (!a) return 0;
    return Math.min(1, 0.6 * (a.escalationLevel / 3) + 0.4 * Math.min(1, a.tacticsUsed.length / 4));
  });

const PRESSURE = [
  { at: 0.67, label: "High pressure", text: "text-signal", bar: "bg-signal" },
  { at: 0.34, label: "Pressure rising", text: "text-amber", bar: "bg-amber" },
  { at: 0, label: "Calm", text: "text-smoke", bar: "bg-dim" },
] as const;
const pressureState = (p: number) => PRESSURE.find((s) => p >= s.at) ?? PRESSURE[2];

/** A hairline across the whole room: grows and turns amber, then red, as the caller pushes. */
function PressureLine() {
  const p = usePressure();
  const s = pressureState(p);
  return (
    <div
      role="meter"
      aria-label="Caller pressure"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
      aria-valuetext={s.label}
      className="h-0.5 shrink-0 bg-line"
    >
      <div
        className={cn("h-full transition-[width,background-color] duration-[900ms] ease-out", s.bar)}
        style={{ width: `${Math.max(3, p * 100)}%` }}
      />
    </div>
  );
}

/** Flashes when the caller changes tactic — without naming it: spotting which one is the player's job. */
function PivotFlash() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let last = useCallStore.getState().agent?.currentTactic ?? null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useCallStore.subscribe((s) => {
      const t = s.agent?.currentTactic ?? null;
      if (!t || t === last) return;
      if (last) {
        setOn(true);
        clearTimeout(timer);
        timer = setTimeout(() => setOn(false), 2600);
      }
      last = t;
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  return (
    <AnimatePresence>
      {on && (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration.ui, ease }}
          className="flex items-center gap-2 text-signal"
        >
          <span aria-hidden className="h-px w-4 bg-signal" /> Caller changed tactic
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function Hud({ level, status }: { level: string; status: CallStatus }) {
  const mode = useCallStore((s) => s.mode);
  const s = pressureState(usePressure());
  return (
    <header className="gutter-x flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line">
      <div className="meta flex min-w-0 items-center gap-4 text-smoke">
        <Link href="/" className="-mx-2 flex min-h-11 items-center px-2 text-bone">
          Scam City
        </Link>
        <span aria-hidden className="hidden h-3 w-px bg-line sm:block" />
        <span className="hidden truncate text-[color:var(--hue-text)] sm:inline">{level}</span>
        {mode && (
          <span className="hidden border border-line px-2 py-0.5 md:inline">{mode === "gemini" ? "Live AI" : "Simulation"}</span>
        )}
        <FreestyleChip />
      </div>
      <div className="meta flex items-center gap-4 lg:gap-6">
        {status === "live" && (
          <>
            <span className="hidden lg:inline">
              <PivotFlash />
            </span>
            <span className={cn("hidden transition-colors duration-[320ms] md:inline", s.text)}>{s.label}</span>
            <span className="flex items-center gap-2 text-signal">
              <span aria-hidden className="live-dot" /> Live
            </span>
          </>
        )}
        {status === "idle" && (
          <span className="flex items-center gap-2 text-signal">
            <span aria-hidden className="live-dot" /> Ringing
          </span>
        )}
        {status === "ringing" && <span className="text-ash">Connecting</span>}
        <CallTimer />
      </div>
    </header>
  );
}

/** A Freestyle call is one encounter of the day: keep the day's stakes in view. */
function FreestyleChip() {
  const status = useFreestyle((s) => s.status);
  const lives = useFreestyle((s) => s.lives);
  const handled = useFreestyle((s) => s.handled);
  const pace = useFreestyle((s) => s.pace);
  if (status !== "active") return null;
  return (
    <span className="hidden items-center gap-2 border border-line px-2 py-0.5 text-ash sm:flex">
      Freestyle
      <Lives lives={lives} />
      <span className="tabular text-smoke">
        {Math.min(handled + 1, goalFor(pace))}/{goalFor(pace)}
      </span>
    </span>
  );
}

function CallTimer() {
  const status = useCallStore((s) => s.status);
  const liveAt = useCallStore((s) => s.liveAt);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (status !== "live" || liveAt === null) return;
    const tick = () => setNow(performance.now() - liveAt);
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [status, liveAt]);

  if (liveAt === null) return null;
  return (
    <span className="tabular text-bone" aria-label="Call duration">
      {fmt(now)}
    </span>
  );
}

function RingWaves() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {[0, 1, 2].map((i) => (
        <span key={i} className="ring-wave" style={{ animationDelay: `${i}s` }} />
      ))}
    </div>
  );
}

function SpeakerLine() {
  const speaking = useCallStore((s) => s.speaking);
  return (
    <div className="absolute inset-x-6 bottom-20 flex items-end gap-4 md:inset-x-8 md:bottom-24">
      <Waveform active={speaking !== null} className="flex-1" />
    </div>
  );
}

const subscribeClock = (cb: () => void) => {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
};
const readClock = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function LocalClock() {
  const time = useSyncExternalStore(subscribeClock, readClock, () => "--:--");
  return <span className="tabular">{time}</span>;
}

/** The incoming-call screen: who it claims to be, what it's "about", and the state of the line. */
function Incoming({
  district,
  bonus,
  precise,
  onPrecise,
  onAnswer,
}: {
  district: District;
  bonus: boolean;
  precise: boolean;
  onPrecise: (v: boolean) => void;
  onAnswer: () => void;
}) {
  const ai = useAiStatus();
  const live = Boolean(ai?.gemini) && !mockForced();

  return (
    <div className="flex flex-1 flex-col justify-center gap-7 lg:max-w-xl">
      <p className="meta flex items-center gap-3 text-signal">
        <Phone aria-hidden strokeWidth={1.5} className="size-3.5" /> Incoming call
        <span className="text-smoke">
          · <RingTimer className="tabular" />
        </span>
      </p>

      <div className="flex flex-col gap-3">
        <p className="meta text-[color:var(--hue-text)]">{bonus ? "Fraud Prevention" : district.department}</p>
        <h1 className="display-m uppercase">{district.org}</h1>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="font-mono text-lg tracking-[0.06em] text-bone tabular">{bonus ? BONUS.callerId : district.callerId}</span>
          <span className="meta border border-amber/60 px-2 py-0.5 text-amber">Caller ID unverified</span>
        </p>
      </div>

      <p className="border-l-2 border-amber pl-4 text-lg leading-snug text-bone">{bonus ? BONUS.alert : district.alert}</p>

      <dl className="meta grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 text-smoke sm:grid-cols-3">
        <div>
          <dt>Your time</dt>
          <dd className="mt-1 text-bone">
            <LocalClock />
          </dd>
        </div>
        <div>
          <dt>Line</dt>
          <dd className="mt-1 text-bone">{ai === null ? "Checking…" : live ? "Live AI voice" : "Scripted"}</dd>
        </div>
        <div>
          <dt>Microphone</dt>
          <dd className="mt-1 text-bone">{live ? "Asked on answer" : "Not needed"}</dd>
        </div>
      </dl>

      {live ? (
        <label className="flex max-w-[46ch] cursor-pointer items-start gap-3 text-sm leading-relaxed text-ash">
          <input
            type="checkbox"
            checked={precise}
            onChange={(e) => onPrecise(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-[var(--color-bone)]"
          />
          <span>
            <span className="text-bone">Personalise this call</span> with my real location and weather. The caller will use
            them against you.
            <span className="block text-smoke">Off by default. Coordinates go to open-meteo and BigDataCloud only.</span>
          </span>
        </label>
      ) : (
        ai !== null && (
          <p className="max-w-[46ch] text-sm leading-relaxed text-smoke">
            Scripted replies stand in for your voice here. With a Gemini key on the server, this becomes a live AI caller.
          </p>
        )
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onAnswer} data-cursor="enter" disabled={ai === null} autoFocus>
          <Phone aria-hidden strokeWidth={1.5} className="size-4" /> Answer
        </Button>
        <Button asChild variant="ghost">
          <Link href="/#city">
            <PhoneOff aria-hidden strokeWidth={1.5} className="size-4" /> Decline
          </Link>
        </Button>
      </div>

    </div>
  );
}

function Permission() {
  return (
    <div className="flex flex-1 flex-col justify-center gap-6 lg:max-w-xl">
      <p className="meta flex items-center gap-3 text-ash">
        <Mic aria-hidden strokeWidth={1.25} className="size-4" /> Microphone
      </p>
      <h1 className="display-m">Allow the microphone.</h1>
      <p className="lead max-w-[44ch] text-ash">
        Your voice streams to the caller for this call only. Audio is never stored. Headphones help the caller hear you
        clearly.
      </p>
    </div>
  );
}

function Connecting({ org }: { org: string }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-4">
      <p className="meta text-ash">Connecting to {org}…</p>
      <span className="relative block h-px w-48 overflow-hidden bg-line">
        <motion.span
          className="absolute inset-y-0 left-0 w-1/3 bg-[color:var(--hue-text)]"
          animate={{ x: ["-100%", "300%"] }}
          transition={{ duration: 1.4, ease: "linear", repeat: Infinity }}
        />
      </span>
    </div>
  );
}

function Dropped({ onRetry, onScripted }: { onRetry: () => void; onScripted: () => void }) {
  const error = useCallStore((s) => s.error);
  return (
    <div className="flex flex-1 flex-col justify-center gap-6 lg:max-w-xl">
      <h1 className="display-m">The line dropped.</h1>
      <p className="lead text-ash">{error?.message ?? "The connection was lost."}</p>
      <div className="flex flex-wrap gap-4">
        <Button onClick={onRetry}>Retry</Button>
        <Button variant="ghost" onClick={onScripted}>
          Continue with the scripted call
        </Button>
      </div>
    </div>
  );
}

function Conversation({
  persona,
  status,
  onChoose,
  onSend,
}: {
  persona: ScammerPersona;
  status: CallStatus;
  onChoose: (id: string) => void;
  onSend: (text: string) => void;
}) {
  const transcript = useCallStore((s) => s.transcript);
  const options = useCallStore((s) => s.options);
  const mode = useCallStore((s) => s.mode);
  const context = useCallStore((s) => s.context);
  const planner = useCallStore((s) => s.planner);
  const reduced = useReducedMotion();
  const log = useRef<HTMLOListElement>(null);
  const settled = status === "ending" || status === "scoring";

  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [transcript, options.length, reduced]);

  useEffect(() => {
    if (!options.length) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const option = options[Number(e.key) - 1];
      if (option) onChoose(option.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [options, onChoose]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn("transition-opacity duration-[320ms] ease-out", settled && "opacity-40")}>
        {status === "ringing" && (
          <p className="meta mb-4 flex items-center gap-3 text-ash">
            <span aria-hidden className="live-dot" /> Connecting · Unknown
          </p>
        )}
        <p className="font-display text-[clamp(1.75rem,3vw,2.75rem)] leading-none tracking-[-0.02em] uppercase">
          {persona.name}
        </p>
        <p className="meta mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-smoke">
          <span>
            {persona.role} · {persona.organization}
          </span>
          <span className="text-amber">Unverified</span>
        </p>
        {mode === "gemini" && context && (
          <p className="meta mt-2 text-smoke">
            In play · <span className="text-ash normal-case tracking-[0.04em]">{describeContext(context)}</span>
          </p>
        )}
        {planner === "director" && <p className="meta mt-2 hidden text-smoke sm:block">A new call, written for you</p>}
      </div>

      <ol
        ref={log}
        role="log"
        aria-label="Call transcript"
        aria-live="polite"
        className={cn(
          "mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-2 transition-opacity duration-[320ms] ease-out lg:mt-10 lg:gap-5",
          "[mask-image:linear-gradient(to_bottom,transparent,black_2.5rem)]",
          settled && "opacity-40",
        )}
      >
        <li aria-hidden className="mt-auto" />
        {transcript.map((m, i) => {
          const current = i === transcript.length - 1;
          const player = m.speaker === "player";
          return (
            <motion.li
              key={m.id}
              layout={!reduced}
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: duration.ui, ease }}
              className={cn("max-w-[36ch] lg:max-w-[44ch]", player && "self-end text-right")}
            >
              <span className="meta mb-1.5 block text-smoke">{player ? "You" : persona.name.split(" ")[0]}</span>
              <span
                className={cn(
                  "block transition-colors duration-[320ms] ease-out",
                  // Explicit classes: tailwind-merge treats `quote` as a font size and
                  // would drop it next to a text-[…] size.
                  player
                    ? "text-base leading-snug sm:text-lg"
                    : current
                      ? m.text.length > 140
                        ? "font-display text-[clamp(1.25rem,1.9vw,1.875rem)] leading-[1.25] italic"
                        : "quote"
                      : "font-display text-[clamp(1.0625rem,1.6vw,1.375rem)] leading-snug italic",
                  current ? "text-bone" : "text-ash",
                )}
              >
                {player ? m.text : `“${m.text}”`}
              </span>
            </motion.li>
          );
        })}
      </ol>

      {mode === "gemini" && status === "live" && <TalkBar onSend={onSend} />}

      <AnimatePresence>
        {options.length > 0 && (
          <motion.fieldset
            key={options.map((o) => o.id).join()}
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: duration.ui * 0.6 } }}
            transition={{ duration: duration.ui, ease }}
            className="mt-6 shrink-0"
          >
            <legend className="meta mb-2 text-smoke">Your reply</legend>
            <ul>
              {options.map((o, i) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => onChoose(o.id)}
                    data-cursor="talk"
                    className="group flex min-h-14 w-full items-center gap-4 border-t border-line py-3 text-left transition-colors duration-[180ms] ease-out hover:border-bone"
                  >
                    <span className="meta w-5 shrink-0 text-smoke group-hover:text-bone">{i + 1}</span>
                    <span className="text-lg leading-snug text-ash transition-colors duration-[180ms] group-hover:text-bone">
                      {o.text}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.fieldset>
        )}
      </AnimatePresence>

      {settled && (
        <div className="mt-6 shrink-0">{status === "ending" ? <p className="meta text-bone">Call ended</p> : <JudgingProgress />}</div>
      )}
    </div>
  );
}

/** Live mode: talk out loud; typing is the fallback for a loud demo room. */
function TalkBar({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  const muted = useCallStore((s) => s.muted);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText("");
  };

  return (
    <form onSubmit={submit} className="mt-3 flex shrink-0 flex-col gap-2 border-t border-line pt-3 lg:mt-6 lg:gap-3 lg:pt-4">
      <p className="meta text-smoke">
        {muted ? "Muted · type your reply" : "Speak naturally · interrupt any time · or type"}
      </p>
      <div className="flex items-center gap-3">
        <label htmlFor="talk-text" className="sr-only">
          Type a reply
        </label>
        <input
          id="talk-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          placeholder="Say something to the caller…"
          className="min-h-12 flex-1 border-b border-line bg-transparent text-lg text-bone placeholder:text-dim focus:border-bone focus:outline-none"
        />
        <Button type="submit" variant="ghost" size="md" aria-label="Send reply" disabled={!text.trim()}>
          <SendHorizontal aria-hidden strokeWidth={1.25} className="size-4" />
        </Button>
      </div>
    </form>
  );
}

function Controls({
  muted,
  status,
  onMute,
  onEnd,
}: {
  muted: boolean;
  status: CallStatus;
  onMute: () => void;
  onEnd: () => void;
}) {
  const agent = useCallStore((s) => s.agent);
  const detected = useCallStore((s) => s.detected);
  const learned = useProgressStore((s) => s.learned);
  const canEnd = status === "live" || status === "ringing";

  return (
    <footer className="gutter-x flex shrink-0 flex-col gap-3 border-t border-line bg-surface pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:flex-row md:items-center md:justify-between md:gap-4 md:pt-4 md:pb-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Meter value={agent?.suspicionEstimate ?? 0} />
        <ul aria-label="Red flags you have learned" className="flex flex-wrap gap-2">
          {learned.map((t) => (
            <TacticChip key={t} tactic={t} hit={detected.some((d) => d.tactic === t)} inPlay={Boolean(agent?.tacticsUsed.includes(t))} />
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between gap-3 md:justify-end">
        <Button
          variant="ghost"
          size="md"
          onClick={onMute}
          aria-pressed={muted}
          data-cursor="talk"
          className="min-h-14 md:min-h-12"
        >
          {muted ? (
            <MicOff aria-hidden strokeWidth={1.25} className="size-4" />
          ) : (
            <Mic aria-hidden strokeWidth={1.25} className="size-4" />
          )}
          {muted ? "Muted" : "Mic on"}
          {!muted && <span aria-hidden className="live-dot" />}
          <span aria-hidden className="meta hidden text-smoke lg:inline">
            M
          </span>
        </Button>
        <Button variant="signal" size="md" onClick={onEnd} disabled={!canEnd} className="min-h-14 md:min-h-12">
          <PhoneOff aria-hidden strokeWidth={1.5} className="size-4" /> Hang up
        </Button>
      </div>
    </footer>
  );
}

/** Announces state changes only — never partial speech (pages/call-room.md). */
function Announcer({ level }: { level: string }) {
  const status = useCallStore((s) => s.status);
  const muted = useCallStore((s) => s.muted);
  const high = useCallStore((s) => (s.agent?.suspicionEstimate ?? 0) >= 0.7);

  const message = useMemo(() => {
    if (status === "idle") return `Incoming call. ${level}.`;
    if (status === "live") return high ? "Caller suspicion high." : `Call connected. ${level}.`;
    if (status === "permission-requested") return "Allow microphone access to take the call.";
    if (status === "ringing") return "Connecting.";
    if (status === "ending") return "Call ended.";
    if (status === "scoring") return "Reviewing transcript.";
    if (status === "error") return "The line dropped.";
    return "";
  }, [status, high, level]);

  return (
    <p role="status" aria-atomic="true" className="sr-only">
      {message}
      {muted ? " Microphone muted." : ""}
    </p>
  );
}
