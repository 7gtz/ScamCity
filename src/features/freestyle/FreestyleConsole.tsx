"use client";

import { Bell, BellOff, Globe, Mail, MessageSquare, Phone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { tacticLabel } from "@/content/tactics";
import { DefenseCard } from "@/features/profile/Profile";
import { useProgressStore, weakest } from "@/features/progress/progress-store";
import { cn } from "@/lib/cn";
import { describeContext, getRealWorldContext } from "@/lib/live/real-world";
import { DayHud, outcomeTone, outcomeWord } from "./DayHud";
import { LIVES, routeFor, tally, useFreestyle } from "./freestyle-store";
import { unlockRingtone } from "./ringtone";
import { goalFor, MIN_GENUINE, PACES, type Pace } from "./schedule";

const ICONS = { call: Phone, email: Mail, sms: MessageSquare, web: Globe } as const;

function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  useEffect(() => {
    // Read after mount: Notification is browser-only.
    const read = () => setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
    read();
    window.addEventListener("focus", read);
    return () => window.removeEventListener("focus", read);
  }, []);
  return [permission, setPermission] as const;
}

/** `/freestyle?demo=1` opens with the three-encounter demo selected. Read from the URL (static page). */
const noSubscribe = () => () => {};
const readDemo = () => new URLSearchParams(window.location.search).has("demo");

/** Wake up, carry on with your day, and let the city come to you. */
export function FreestyleConsole() {
  const status = useFreestyle((s) => s.status);
  const demoLink = useSyncExternalStore(noSubscribe, readDemo, () => false);
  const [chosen, setChosen] = useState<Pace | null>(null);
  const pace = chosen ?? (demoLink ? "demo" : "normal");
  // Off until the player chooses it: personalising with real location is an explicit decision.
  const [precise, setPrecise] = useState(false);
  const [waking, setWaking] = useState(false);
  const [permission, setPermission] = useNotificationPermission();
  const goal = goalFor(pace);

  const wake = async () => {
    setWaking(true);
    unlockRingtone(); // this click unlocks audio for the ringtone later
    let granted = permission;
    if (permission === "default" && typeof Notification !== "undefined") {
      granted = await Notification.requestPermission();
      setPermission(granted);
    }
    const context = await getRealWorldContext(precise);
    useFreestyle.getState().wake(pace, context);
    if (granted === "granted") {
      new Notification("You're active on SCAM CITY", {
        body: "Carry on with your day. Something will reach you soon.",
        tag: "scam-city",
      });
    }
    setWaking(false);
  };

  if (status === "idle") {
    return (
      <div className="grid gap-16 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-8 lg:col-span-6">
          <p className="meta text-smoke">Freestyle · All channels</p>
          <h1 className="display-l">
            Wake up.
            <br />
            <em className="font-light normal-case">Then live your day.</em>
          </h1>
          <p className="lead max-w-[44ch] text-ash">
            Your computer is the game board. Your voice is the controller. Calls, emails, texts and links reach you on
            your desktop, at random. Some are genuine. The rest are trying to get something from you.
          </p>
          <ul className="flex max-w-[48ch] flex-col gap-3 border-t border-line pt-5 text-ash">
            <li className="flex gap-3">
              <span className="meta w-16 shrink-0 pt-1 text-smoke">Lives</span>
              <span>
                {LIVES}. Fall for a scam and you lose one. Turn away something genuine and you lose one too.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="meta w-16 shrink-0 pt-1 text-smoke">Win</span>
              <span>
                {pace === "demo"
                  ? "Three encounters, back to back: an email, then a text aimed at whatever the email exposed, then a call."
                  : `Survive ${goal} encounters. At least ${MIN_GENUINE} of them are genuine.`}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="meta w-16 shrink-0 pt-1 text-smoke">Learns</span>
              <span>It gets harder as you go, and what works on you in one channel follows you into the next.</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-8 lg:col-span-5 lg:col-start-8">
          <fieldset>
            <legend className="meta mb-3 text-smoke">Pace</legend>
            {(Object.keys(PACES) as Pace[]).map((p) => (
              <label
                key={p}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-4 border-t border-line transition-colors duration-[320ms] last-of-type:border-b",
                  pace === p ? "text-bone" : "text-ash hover:text-bone",
                  "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-bone",
                )}
              >
                <input type="radio" name="pace" checked={pace === p} onChange={() => setChosen(p)} className="sr-only" />
                <span aria-hidden className={cn("size-2 rounded-full", pace === p ? "bg-bone" : "bg-line")} />
                <span className="ui-label">{PACES[p].label}</span>
              </label>
            ))}
          </fieldset>

          <label className="flex max-w-[46ch] cursor-pointer items-start gap-3 text-sm leading-relaxed text-ash">
            <input
              type="checkbox"
              checked={precise}
              onChange={(e) => setPrecise(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-[var(--color-bone)]"
            />
            <span>
              <span className="text-bone">Personalise my day</span> with my real location and weather. Every encounter is
              then written for where you are.
              <span className="block text-smoke">
                Off by default: local time and timezone are used instead. Coordinates go to open-meteo and BigDataCloud only.
              </span>
            </span>
          </label>

          <p className="meta flex items-center gap-3 text-smoke">
            {permission === "granted" ? (
              <Bell aria-hidden strokeWidth={1.25} className="size-4" />
            ) : (
              <BellOff aria-hidden strokeWidth={1.25} className="size-4" />
            )}
            {permission === "granted"
              ? "Desktop notifications on"
              : permission === "denied"
                ? "Notifications blocked — encounters will still appear in the app"
                : permission === "unsupported"
                  ? "This browser has no notifications — encounters appear in the app"
                  : "You'll be asked to allow notifications"}
          </p>

          <Button onClick={wake} disabled={waking} className="self-start" data-cursor="enter">
            {waking ? "Waking…" : "Wake up"}
          </Button>
        </div>
      </div>
    );
  }

  return <ActiveConsole />;
}

function ActiveConsole() {
  const status = useFreestyle((s) => s.status);
  const log = useFreestyle((s) => s.log);
  const current = useFreestyle((s) => s.current);
  const context = useFreestyle((s) => s.context);
  const pace = useFreestyle((s) => s.pace);
  const weak = useProgressStore((s) => s.weak);
  const aimed = weakest(weak, 2);
  const t = tally(log);

  return (
    <div className="grid gap-16 lg:grid-cols-12 lg:gap-8">
      <div className="flex flex-col gap-10 lg:col-span-6">
        <div className="flex flex-col gap-6">
          <p role="status" className="meta flex items-center gap-3 text-ash">
            {status === "active" && <span aria-hidden className="live-dot" />}
            {status === "active" ? `Freestyle · live · ${PACES[pace].label.split(" · ")[0]}` : "Freestyle · day over"}
          </p>
          <h1 className="display-l">
            {status === "active" ? (
              <>
                You&rsquo;re active
                <br />
                <em className="font-light normal-case">on SCAM CITY.</em>
              </>
            ) : status === "won" ? (
              <>
                You made it
                <br />
                <em className="font-light normal-case">through the day.</em>
              </>
            ) : (
              <>
                They got you.
                <br />
                <em className="font-light normal-case">This time.</em>
              </>
            )}
          </h1>
          {status === "active" && (
            <p className="lead max-w-[44ch] text-ash">
              Carry on — browse the site, open another tab. Something will reach you when you least expect it. Keep this
              tab open.
            </p>
          )}
        </div>

        <DayHud />

        {status === "active" && current && (
          <div className="flex flex-col gap-4 border-l-2 border-amber pl-4">
            <p className="meta text-amber">Still open</p>
            <p className="text-bone">{current.title}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="md">
                <Link href={routeFor(current)}>Go back to it</Link>
              </Button>
              <Button variant="ghost" size="md" onClick={() => useFreestyle.getState().abandon()}>
                Walk away
              </Button>
            </div>
          </div>
        )}

        {status === "active" && aimed.length > 0 && (
          <div className="flex max-w-[48ch] flex-col gap-1.5 border-l-2 border-signal pl-4">
            <p className="meta text-signal">The city is learning</p>
            <p className="text-bone first-letter:uppercase">
              {aimed.map((a) => tacticLabel(a).toLowerCase()).join(" and ")} got past you before.
            </p>
            <p className="text-ash">Whatever arrives next may lean on {aimed.length > 1 ? "them" : "it"}.</p>
          </div>
        )}

        {context && (
          <p className="meta text-smoke">
            In play · <span className="text-ash normal-case tracking-[0.04em]">{describeContext(context)}</span>
          </p>
        )}

        <div className="flex flex-wrap gap-4">
          {status === "active" ? (
            <Button variant="ghost" size="md" onClick={() => useFreestyle.getState().stop()}>
              Go to sleep
            </Button>
          ) : (
            <Button size="md" onClick={() => useFreestyle.getState().stop()}>
              Start a new day
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-16 lg:col-span-5 lg:col-start-8">
        {status !== "active" && <DefenseCard falseAlarms={t.falseAlarms} trusted={t.genuineTrusted} className="border-t-0 pt-0" />}

        <section aria-label="Today">
          <h2 className="meta mb-4 text-smoke">Today</h2>
          {log.length === 0 ? (
            <p className="border-t border-line py-4 text-ash">Nothing yet. Stay alert.</p>
          ) : (
            <ol>
              {log.map((entry) => {
                const Icon = ICONS[entry.channel];
                return (
                  <li key={entry.id} className="flex items-start gap-4 border-t border-line py-4">
                    <Icon aria-hidden strokeWidth={1.25} className="mt-0.5 size-4 shrink-0 text-smoke" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-bone">{entry.title}</p>
                      <p className="meta mt-1 text-smoke">
                        {entry.legit ? "Genuine" : "Scam"}
                        {entry.difficulty && ` · Level ${entry.difficulty}`} ·{" "}
                        {new Date(entry.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className={cn("meta shrink-0 text-right", outcomeTone(entry))}>
                      {outcomeWord(entry)}
                      {(entry.caught || (entry.legit && !entry.correct)) && <span className="block">−1 life</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
