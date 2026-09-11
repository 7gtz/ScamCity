"use client";

import { Check, ChevronDown, Flag, Inbox as InboxIcon, Paperclip, Search, Send, Star, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { gradeDecision, type Decision } from "@/features/encounters/grade";
import { recordEncounter } from "@/features/encounters/record";
import { Highlight, Verdict } from "@/features/encounters/Verdict";
import { freestyleEncounter } from "@/features/freestyle/freestyle-store";
import { cn } from "@/lib/cn";
import { fetchEmail, type EmailEncounter } from "@/lib/encounters";

const OLDER = [
  { from: "Meridian Home", subject: "Your order has shipped", time: "Mon" },
  { from: "Kavya · Book club", subject: "Thursday's pick?", time: "Sun" },
  { from: "City Library", subject: "Your loan is due back soon", time: "Sat" },
];

/** Inbox mode: one fresh email in a real-feeling mail client. Report it or trust it. */
export function InboxPlayer() {
  const [email, setEmail] = useState<EmailEncounter | null>(null);
  const [fromFreestyle, setFromFreestyle] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [statusUrl, setStatusUrl] = useState<string | null>(null);
  const [peek, setPeek] = useState<number | null>(null);
  const [details, setDetails] = useState(false);
  const served = useRef<string[]>([]);

  const load = async () => {
    const e = await fetchEmail({ avoid: served.current });
    served.current.push(e.subject);
    setEmail(e);
  };

  useEffect(() => {
    let alive = true;
    void (async () => {
      const encounter = freestyleEncounter("email");
      const e = encounter?.email ?? (await fetchEmail({ avoid: [] }));
      if (!alive) return;
      served.current.push(e.subject);
      setFromFreestyle(Boolean(encounter));
      setEmail(e);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const next = () => {
    setEmail(null);
    setDecision(null);
    setStatusUrl(null);
    setPeek(null);
    setDetails(false);
    void load();
  };

  const decide = (d: Decision) => {
    if (!email || decision) return;
    setDecision(d);
    const g = gradeDecision(email.scam, d);
    recordEncounter({ channel: "email", scam: email.scam, correct: g.correct, caught: g.caught, targets: email.targets, title: `${email.fromName} — ${email.subject}` });
  };

  const openLink = (i: number) => {
    if (!email || decision) return;
    const link = email.links[i];
    if (!link) return;
    // Touch has no hover: the first tap reveals where the link really goes.
    if (window.matchMedia("(hover: none)").matches && peek !== i) {
      setPeek(i);
      setStatusUrl(link.actualUrl);
      return;
    }
    setStatusUrl(`Opened ${link.actualUrl}`);
    decide("engaged");
  };

  const decided = decision !== null;
  const needles = email?.tells.map((t) => t.text) ?? [];
  const flagged = (s: string) => decided && needles.some((n) => n.length >= 3 && (s.includes(n) || n.includes(s)));

  return (
    <div className="flex flex-col gap-12">
      <div className="relative overflow-hidden rounded-[8px] border border-line bg-paper text-paper-ink">
        {/* App bar */}
        <div className="flex h-14 items-center gap-4 border-b border-paper-line px-4">
          <span className="font-sans text-lg font-semibold tracking-tight">Mail</span>
          <span className="flex h-9 flex-1 items-center gap-2 rounded-[6px] bg-paper-2 px-3 text-sm text-paper-muted md:max-w-md">
            <Search aria-hidden className="size-4" strokeWidth={1.5} /> Search mail
          </span>
        </div>

        <div className="grid min-h-[560px] md:grid-cols-[260px_1fr] lg:grid-cols-[180px_280px_1fr]">
          {/* Folders */}
          <nav aria-hidden className="hidden flex-col gap-1 border-r border-paper-line p-3 text-sm lg:flex">
            {[
              [InboxIcon, "Inbox", "1"],
              [Star, "Starred", ""],
              [Send, "Sent", ""],
              [Flag, "Spam", ""],
              [Trash2, "Bin", ""],
            ].map(([Icon, label, count]) => {
              const I = Icon as typeof InboxIcon;
              return (
                <span key={label as string} className={cn("flex items-center gap-3 rounded-[6px] px-3 py-2", label === "Inbox" && "bg-paper-2 font-semibold")}>
                  <I className="size-4" strokeWidth={1.5} />
                  {label as string}
                  <span className="ml-auto text-xs">{count as string}</span>
                </span>
              );
            })}
          </nav>

          {/* Message list */}
          <ul aria-hidden className="hidden border-r border-paper-line md:block">
            <li className="border-b border-paper-line bg-paper-2 px-4 py-3">
              {email ? (
                <>
                  <p className="flex justify-between text-sm font-semibold">
                    <span className="truncate">{email.fromName}</span>
                    <span className="shrink-0 pl-2 text-xs font-normal text-paper-muted">{email.receivedAt.split(",").at(-1)}</span>
                  </p>
                  <p className="truncate text-sm font-semibold">{email.subject}</p>
                  <p className="truncate text-xs text-paper-muted">{email.paragraphs.join(" ").replace(/\[link:\d+\]/g, "").slice(0, 90)}</p>
                </>
              ) : (
                <p className="text-sm text-paper-muted">Loading…</p>
              )}
            </li>
            {OLDER.map((m) => (
              <li key={m.subject} className="border-b border-paper-line px-4 py-3 text-paper-muted">
                <p className="flex justify-between text-sm">
                  <span>{m.from}</span>
                  <span className="text-xs">{m.time}</span>
                </p>
                <p className="truncate text-sm">{m.subject}</p>
              </li>
            ))}
          </ul>

          {/* Reading pane */}
          <article aria-label="Email" aria-busy={!email} className="relative flex flex-col px-5 pt-5 pb-14 md:px-8">
            {!email ? (
              <div className="flex flex-1 flex-col justify-center gap-3 text-paper-muted">
                <span className="h-5 w-2/3 animate-pulse rounded-[4px] bg-paper-2" />
                <span className="h-4 w-1/3 animate-pulse rounded-[4px] bg-paper-2" />
                <span className="mt-4 h-24 w-full animate-pulse rounded-[4px] bg-paper-2" />
                <span className="text-sm">A new email is arriving…</span>
              </div>
            ) : (
              <>
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => decide("report")}
                    disabled={decided}
                    className="flex min-h-10 items-center gap-2 rounded-[6px] border border-paper-line px-3 text-sm font-medium hover:bg-paper-2 disabled:opacity-50"
                  >
                    <Flag aria-hidden className="size-4" strokeWidth={1.5} /> Report phishing
                  </button>
                  <button
                    type="button"
                    onClick={() => decide("trust")}
                    disabled={decided}
                    className="flex min-h-10 items-center gap-2 rounded-[6px] border border-paper-line px-3 text-sm font-medium hover:bg-paper-2 disabled:opacity-50"
                  >
                    <Check aria-hidden className="size-4" strokeWidth={1.5} /> Looks safe
                  </button>
                </div>

                <h2 className="text-xl leading-snug font-semibold md:text-2xl">
                  <Highlight text={email.subject} needles={needles} on={decided} />
                </h2>

                <div className="mt-4 flex items-start gap-3">
                  <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-paper-2 font-semibold">
                    {email.fromName.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold">{email.fromName}</span>
                      <span className={cn("break-all text-paper-muted", flagged(email.fromAddress) && "underline decoration-signal decoration-2")}>
                        &lt;{email.fromAddress}&gt;
                      </span>
                    </p>
                    <button type="button" onClick={() => setDetails((d) => !d)} className="flex min-h-8 items-center gap-1 text-paper-muted" aria-expanded={details}>
                      to me <ChevronDown aria-hidden className={cn("size-3.5 transition-transform", details && "rotate-180")} />
                    </button>
                    {details && (
                      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-[6px] border border-paper-line p-3 text-xs">
                        <dt className="text-paper-muted">from</dt>
                        <dd className="break-all">{email.fromAddress}</dd>
                        <dt className="text-paper-muted">reply-to</dt>
                        <dd className={cn("break-all", email.replyTo && flagged(email.replyTo) && "underline decoration-signal decoration-2")}>
                          {email.replyTo ?? email.fromAddress}
                        </dd>
                        <dt className="text-paper-muted">date</dt>
                        <dd>{email.receivedAt}</dd>
                      </dl>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-paper-muted">{email.receivedAt}</span>
                </div>

                {email.attachments.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {email.attachments.map((a) => (
                      <button
                        key={a.name}
                        type="button"
                        onClick={() => decide("engaged")}
                        disabled={decided}
                        className={cn(
                          "flex min-h-11 items-center gap-2 rounded-[6px] border border-paper-line px-3 text-sm hover:bg-paper-2",
                          flagged(a.name) && "border-signal",
                        )}
                      >
                        <Paperclip aria-hidden className="size-4" strokeWidth={1.5} />
                        <span className="font-medium">{a.name}</span>
                        <span className="text-paper-muted">{a.size}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex max-w-[65ch] flex-col gap-4 text-[0.97rem] leading-relaxed whitespace-pre-line">
                  {email.paragraphs.map((p, pi) => (
                    <p key={pi}>
                      {p.split(/(\[link:\d+\])/).map((part, i) => {
                        const m = part.match(/^\[link:(\d+)\]$/);
                        const link = m ? email.links[Number(m[1])] : undefined;
                        if (!m) return <Highlight key={i} text={part} needles={needles} on={decided} />;
                        if (!link) return null;
                        const idx = Number(m[1]);
                        return (
                          <button
                            key={i}
                            type="button"
                            onMouseEnter={() => !decided && setStatusUrl(link.actualUrl)}
                            onMouseLeave={() => !decided && peek === null && setStatusUrl(null)}
                            onFocus={() => !decided && setStatusUrl(link.actualUrl)}
                            onClick={() => openLink(idx)}
                            className={cn(
                              "inline text-paper-link underline underline-offset-2",
                              flagged(link.text) && "decoration-signal decoration-2",
                            )}
                          >
                            {link.text}
                          </button>
                        );
                      })}
                    </p>
                  ))}
                </div>

                {/* Browser-style status bar: where the hovered link really goes. */}
                {statusUrl && (
                  <div className="absolute right-3 bottom-3 left-3 flex items-center gap-3 md:right-auto">
                    <span className="max-w-full truncate rounded-[4px] border border-paper-line bg-paper px-2 py-1 font-mono text-xs text-paper-muted">
                      {statusUrl}
                    </span>
                    {peek !== null && !decided && (
                      <button type="button" onClick={() => openLink(peek)} className="shrink-0 rounded-[4px] bg-paper-ink px-3 py-1 text-xs text-paper">
                        Open link
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </article>
        </div>
      </div>

      {email && decision && (
        <Verdict
          grade={gradeDecision(email.scam, decision)}
          scam={email.scam}
          explanation={email.explanation}
          tells={email.tells}
          freestyle={fromFreestyle}
          onNext={next}
          nextLabel="Next email"
          source={email.source}
        />
      )}
    </div>
  );
}
