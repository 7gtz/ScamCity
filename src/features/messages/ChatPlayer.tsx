"use client";

import { ChevronLeft, SendHorizontal } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CtaLink } from "@/components/ui/CtaLink";
import { Meter } from "@/components/ui/Meter";
import { tacticLabel } from "@/content/tactics";
import { freestyleEncounter, useFreestyle } from "@/features/freestyle/freestyle-store";
import { useProgressStore } from "@/features/progress/progress-store";
import { useResultsStore } from "@/features/scoring/results-store";
import { scoreCall } from "@/features/scoring/score-call";
import { cn } from "@/lib/cn";
import { chatTurn, startChat } from "@/lib/encounters";
import type { CallOutcome, CompletedCall, TacticId, TranscriptMessage } from "@/lib/live/types";
import type { ChatPlan } from "@/lib/validation/schemas";
import { duration, ease } from "@/lib/motion/tokens";

type Phase = "loading" | "unavailable" | "live" | "ending";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Messages mode: a live AI texting conversation. The contact adapts to every
 * reply, and each turn also comes back with the analyst's read for the HUD.
 */
export function ChatPlayer() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const learned = useProgressStore((s) => s.learned);
  const [phase, setPhase] = useState<Phase>("loading");
  const [plan, setPlan] = useState<ChatPlan | null>(null);
  const [difficulty, setDifficulty] = useState(1);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [suspicion, setSuspicion] = useState(0);
  const [detected, setDetected] = useState<{ tactic: TacticId; at: number }[]>([]);
  const started = useRef(0);
  const revealed = useRef<string[]>([]);
  const suspicionLog = useRef<{ at: number; value: number }[]>([{ at: 0, value: 0 }]);
  const log = useRef<HTMLOListElement>(null);

  const elapsed = () => Math.round(performance.now() - started.current);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const encounter = freestyleEncounter("sms");
      const chat = encounter?.chat ?? (await startChat());
      if (!alive) return;
      if (!chat) {
        setPhase("unavailable");
        return;
      }
      setPlan(chat.plan);
      setDifficulty(chat.difficulty);
      started.current = performance.now();
      setPhase("live");
      setTyping(true);
      await wait(900);
      if (!alive) return;
      setTyping(false);
      setMessages([{ id: "c0", speaker: "scammer", text: chat.plan.opening, at: 0 }]);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [messages, typing, reduced]);

  const finish = async (outcome: CallOutcome, transcript: TranscriptMessage[]) => {
    if (!plan || phase === "ending") return;
    setPhase("ending");
    const call: CompletedCall = {
      sessionId: crypto.randomUUID(),
      scenarioId: "messages",
      legitimate: !plan.scam,
      durationMs: Math.max(1000, elapsed()),
      transcript,
      outcome,
      revealed: revealed.current,
      tacticsDetected: detected,
      suspicion: [...suspicionLog.current, { at: elapsed(), value: suspicion }],
      brief: { caller: `${plan.contactName} · ${plan.platform}`, hook: plan.pattern, objective: plan.objective },
    };
    const score = { ...(await scoreCall(call)), channel: "sms" as const };
    useResultsStore.getState().save(score);
    const progress = useProgressStore.getState();
    const caught = score.caught.map((c) => c.tactic);
    progress.learn([...caught, ...score.missed]);
    progress.recordTactics(score.missed, caught);
    const freestyle = useFreestyle.getState();
    if (freestyle.current?.spec.channel === "sms") {
      freestyle.resolve({ correct: score.passed, caught: outcome === "scammed", title: `${plan.contactLabel} · ${plan.platform}`, legit: !plan.scam });
    }
    router.push(`/results/${score.sessionId}`);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || !plan || phase !== "live" || typing) return;
    setText("");
    const mine: TranscriptMessage = { id: `p${messages.length}`, speaker: "player", text: value, at: elapsed() };
    const history = [...messages, mine];
    setMessages(history);
    setTyping(true);

    const t0 = performance.now();
    const turn = await chatTurn(
      plan,
      difficulty,
      history.map((m) => ({ speaker: m.speaker, text: m.text })),
    );
    if (!turn) {
      setTyping(false);
      setMessages((m) => [...m, { id: `x${m.length}`, speaker: "scammer", text: "(message not delivered — try again)", at: elapsed() }]);
      return;
    }
    // Human typing speed, not instant replies.
    await wait(Math.max(0, Math.min(2600, 500 + turn.reply.length * 25) - (performance.now() - t0)));

    setSuspicion(turn.suspicion);
    suspicionLog.current.push({ at: elapsed(), value: turn.suspicion });
    for (const r of turn.revealed) if (!revealed.current.includes(r)) revealed.current.push(r);
    const newlyDetected = turn.playerDetected.filter((t) => !detected.some((d) => d.tactic === t));
    const nextDetected = [...detected, ...newlyDetected.map((tactic) => ({ tactic, at: mine.at }))];
    setDetected(nextDetected);

    const reply: TranscriptMessage = { id: `c${history.length}`, speaker: "scammer", text: turn.reply, at: elapsed(), tactics: turn.tactics };
    const transcript = [...history, reply];
    setTyping(false);
    setMessages(transcript);
    if (turn.end !== "none") {
      await wait(1600);
      void finish(turn.end, transcript);
    }
  };

  if (phase === "unavailable") {
    return (
      <div className="flex max-w-xl flex-col gap-6">
        <h2 className="display-m">The contact needs the live AI.</h2>
        <p className="lead text-ash">Messages is a real conversation with an AI, so it only runs when the server has a Gemini key.</p>
        <div className="flex flex-wrap gap-6">
          <CtaLink href="/inbox">Try Inbox</CtaLink>
          <CtaLink href="/web">Try Web</CtaLink>
        </div>
      </div>
    );
  }

  const endOutcome = (): CallOutcome =>
    revealed.current.length ? "scammed" : plan && !plan.scam ? "hung-up" : detected.length ? "exposed" : "hung-up";

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
      {/* Phone */}
      <div className="lg:col-span-6 lg:col-start-2">
        <div className="mx-auto flex h-[min(720px,calc(100dvh-12rem))] min-h-[520px] max-w-[440px] flex-col overflow-hidden rounded-[28px] border border-line bg-paper text-paper-ink">
          <header className="flex items-center gap-3 border-b border-paper-line px-4 py-3">
            <ChevronLeft aria-hidden className="size-5 text-paper-muted" strokeWidth={1.5} />
            <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-paper-2 font-semibold">
              {plan?.contactName.charAt(0) ?? "·"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{plan?.contactLabel ?? "Connecting…"}</span>
              <span className="block text-xs text-paper-muted">{plan?.platform ?? ""}</span>
            </span>
          </header>

          <ol ref={log} role="log" aria-label="Conversation" aria-live="polite" className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
            <li aria-hidden className="mt-auto" />
            {messages.map((m) => (
              <motion.li
                key={m.id}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: duration.ui, ease }}
                className={cn(
                  "max-w-[80%] rounded-[18px] px-4 py-2 text-[0.95rem] leading-snug whitespace-pre-line",
                  m.speaker === "player" ? "self-end rounded-br-[6px] bg-paper-ink text-paper" : "self-start rounded-bl-[6px] bg-paper-2",
                )}
              >
                <span className="sr-only">{m.speaker === "player" ? "You: " : `${plan?.contactName}: `}</span>
                {m.text}
              </motion.li>
            ))}
            <AnimatePresence>
              {typing && (
                <motion.li
                  key="typing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex gap-1 self-start rounded-[18px] bg-paper-2 px-4 py-3"
                  aria-label="Typing"
                >
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="size-1.5 animate-pulse rounded-full bg-paper-muted" style={{ animationDelay: `${i * 160}ms` }} />
                  ))}
                </motion.li>
              )}
            </AnimatePresence>
          </ol>

          <form onSubmit={send} className="flex items-center gap-2 border-t border-paper-line p-3">
            <label htmlFor="chat-text" className="sr-only">
              Message
            </label>
            <input
              id="chat-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={phase !== "live"}
              autoComplete="off"
              placeholder={phase === "loading" ? "Waiting for a message…" : "Message"}
              className="min-h-11 flex-1 rounded-full bg-paper-2 px-4 text-base placeholder:text-paper-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-paper-ink"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={!text.trim() || phase !== "live" || typing}
              className="flex size-11 items-center justify-center rounded-full bg-paper-ink text-paper disabled:opacity-40"
            >
              <SendHorizontal aria-hidden className="size-4" strokeWidth={1.5} />
            </button>
          </form>
        </div>
      </div>

      {/* Game HUD */}
      <aside className="flex flex-col gap-8 lg:col-span-4 lg:col-start-8 lg:pt-10">
        <Meter value={suspicion} label="Your guard" />
        <ul aria-label="Red flags you have learned" className="flex flex-wrap gap-2">
          {learned.map((t) => {
            const hit = detected.some((d) => d.tactic === t);
            return (
              <li key={t} className={cn("meta border px-2 py-1 transition-colors duration-[320ms]", hit ? "border-signal text-signal" : "border-line text-smoke")}>
                {tacticLabel(t)}
                <span className="sr-only">{hit ? ", detected" : ", not yet detected"}</span>
              </li>
            );
          })}
        </ul>
        <p className="max-w-[40ch] text-sm leading-relaxed text-ash">
          Reply as you would. Ask questions, check their story, or block them. The contact adapts to what you write, and
          the AI judge reads the whole thread when it ends.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            size="md"
            onClick={() => plan && void finish(plan.scam ? "exposed" : "rejected-legit", messages)}
            disabled={phase !== "live" || messages.length === 0}
          >
            Block &amp; report
          </Button>
          <Button size="md" variant="ghost" onClick={() => void finish(endOutcome(), messages)} disabled={phase !== "live" || messages.length < 2}>
            End conversation
          </Button>
        </div>
        {phase === "ending" && <p className="meta text-bone">Reviewing the conversation…</p>}
        <Link href="/modes" className="meta min-h-11 self-start text-smoke hover:text-bone">
          All modes
        </Link>
      </aside>
    </div>
  );
}
