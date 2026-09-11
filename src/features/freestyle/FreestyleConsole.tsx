"use client";

import { Bell, BellOff, Globe, Mail, MessageSquare, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { describeContext, getRealWorldContext } from "@/lib/live/real-world";
import { GOAL, LIVES, useFreestyle } from "./freestyle-store";
import { unlockRingtone } from "./ringtone";
import { PACES, type Pace } from "./schedule";

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

/** Wake up, carry on with your day, and let the city come to you. */
export function FreestyleConsole() {
  const status = useFreestyle((s) => s.status);
  const [pace, setPace] = useState<Pace>("normal");
  const [precise, setPrecise] = useState(true);
  const [waking, setWaking] = useState(false);
  const [permission, setPermission] = useNotificationPermission();

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
            Press wake up and go back to whatever you were doing. Calls, emails, texts and links will reach you — on
            your desktop, at random, some genuine and some not. The first arrives within twenty seconds.
          </p>
          <ul className="meta flex flex-col gap-2 text-smoke">
            <li>{LIVES} lives · falling for a scam costs one</li>
            <li>Survive {GOAL} encounters to win the day</li>
            <li>Ignoring something genuine is a miss</li>
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
                <input type="radio" name="pace" checked={pace === p} onChange={() => setPace(p)} className="sr-only" />
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
              Use my real location and weather. Every encounter is written for where you are.
              <span className="block text-smoke">Coordinates go to open-meteo and BigDataCloud only.</span>
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
  const lives = useFreestyle((s) => s.lives);
  const handled = useFreestyle((s) => s.handled);
  const log = useFreestyle((s) => s.log);
  const context = useFreestyle((s) => s.context);
  const pace = useFreestyle((s) => s.pace);
  const correct = log.filter((l) => l.correct).length;

  return (
    <div className="grid gap-16 lg:grid-cols-12 lg:gap-8">
      <div className="flex flex-col gap-8 lg:col-span-6">
        <p role="status" className="meta flex items-center gap-3 text-ash">
          {status === "active" && <span aria-hidden className="live-dot" />}
          {status === "active" ? "Freestyle · live" : "Freestyle · day over"}
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
        <p className="lead max-w-[44ch] text-ash">
          {status === "active"
            ? "Carry on — browse the site, open another tab. Something will reach you when you least expect it. Keep this tab open."
            : `${correct} of ${handled} handled well.`}
        </p>
        <dl className="meta grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-line pt-4 text-smoke">
          <dt>Lives</dt>
          <dd className="text-bone" aria-label={`${lives} of ${LIVES}`}>
            {"♥".repeat(Math.max(0, lives))}
            <span className="text-dim">{"♥".repeat(LIVES - Math.max(0, lives))}</span>
          </dd>
          <dt>Survived</dt>
          <dd className="tabular text-bone">
            {handled} / {GOAL}
          </dd>
          <dt>Pace</dt>
          <dd className="text-ash">{PACES[pace].label}</dd>
          {context && (
            <>
              <dt>In play</dt>
              <dd className="text-ash normal-case tracking-[0.04em]">{describeContext(context)}</dd>
            </>
          )}
        </dl>
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

      <section aria-label="Today" className="lg:col-span-5 lg:col-start-8">
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
                      {entry.legit ? "Genuine" : "Scam"} ·{" "}
                      {new Date(entry.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className={cn("meta shrink-0", entry.caught ? "text-signal" : entry.correct ? "text-bone" : "text-ash")}>
                    {entry.caught ? "Scammed" : entry.missed ? (entry.correct ? "Ignored" : "Missed") : entry.correct ? "Handled" : "Wrong call"}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
