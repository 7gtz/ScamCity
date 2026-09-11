"use client";

import { ArrowLeft, ArrowRight, Lock, LockOpen, RotateCw, ShieldAlert, ShieldCheck, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { gradeDecision, type Decision } from "@/features/encounters/grade";
import { recordEncounter } from "@/features/encounters/record";
import { Highlight, Verdict } from "@/features/encounters/Verdict";
import { freestyleEncounter } from "@/features/freestyle/freestyle-store";
import { cn } from "@/lib/cn";
import { fetchSite, type SiteEncounter } from "@/lib/encounters";

/**
 * Brand accents for simulated third-party sites (content, not game UI).
 * Muted, so no generated page reads as neon.
 */
const BRAND_ACCENTS = ["#0f5f5a", "#7a2e1d", "#27407a", "#4d2c73", "#2f5d34", "#7d2340"];
const accentFor = (brand: string) => BRAND_ACCENTS[[...brand].reduce((h, c) => h + c.charCodeAt(0), 0) % BRAND_ACCENTS.length]!;

const ageLabel = (days: number) =>
  days < 60 ? `${days} day${days === 1 ? "" : "s"} ago` : days < 730 ? `${Math.round(days / 30)} months ago` : `${Math.round(days / 365)} years ago`;

/** Web mode: an AI-written page in a simulated browser. Read the address bar before you type. */
export function WebPlayer() {
  const [site, setSite] = useState<SiteEncounter | null>(null);
  const [fromFreestyle, setFromFreestyle] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [info, setInfo] = useState(false);
  const served = useRef<string[]>([]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const encounter = freestyleEncounter("web");
      const s = encounter?.site ?? (await fetchSite({ avoid: [] }));
      if (!alive) return;
      served.current.push(`${s.brand} ${s.domain}`);
      setFromFreestyle(Boolean(encounter));
      setSite(s);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const next = async () => {
    setSite(null);
    setDecision(null);
    setInfo(false);
    const s = await fetchSite({ avoid: served.current });
    served.current.push(`${s.brand} ${s.domain}`);
    setSite(s);
  };

  const decide = (d: Decision) => {
    if (!site || decision) return;
    setDecision(d);
    const g = gradeDecision(site.scam, d);
    recordEncounter({ channel: "web", scam: site.scam, correct: g.correct, caught: g.caught, targets: site.targets, title: `${site.brand} · ${site.domain}` });
  };

  const decided = decision !== null;
  const needles = site?.tells.map((t) => t.text) ?? [];
  const flaggedWhere = (where: string) => decided && site?.tells.some((t) => t.where.toLowerCase().includes(where));
  const accent = site ? accentFor(site.brand) : "#555";

  return (
    <div className="flex flex-col gap-12">
      <div data-tone="paper" className="overflow-hidden rounded-[8px] border border-line bg-paper-2 text-paper-ink">
        {/* Tab strip */}
        <div className="flex h-10 items-end gap-2 px-3 pt-2">
          <span className="flex h-8 max-w-[240px] items-center gap-2 rounded-t-[8px] bg-paper px-3 text-xs">
            <span aria-hidden className="size-3 rounded-[3px]" style={{ background: accent }} />
            <span className="truncate">{site ? `${site.brand} — ${site.headline}` : "Loading…"}</span>
            <X aria-hidden className="size-3 shrink-0 text-paper-muted" />
          </span>
        </div>

        {/* Address bar */}
        <div className="relative flex h-12 items-center gap-3 border-b border-paper-line bg-paper px-3">
          <span aria-hidden className="hidden gap-3 text-paper-muted sm:flex">
            <ArrowLeft className="size-4" strokeWidth={1.5} />
            <ArrowRight className="size-4" strokeWidth={1.5} />
            <RotateCw className="size-4" strokeWidth={1.5} />
          </span>
          <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full bg-paper-2 px-2">
            <button
              type="button"
              onClick={() => setInfo((v) => !v)}
              aria-expanded={info}
              aria-label="View site information"
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-paper-line",
                flaggedWhere("padlock") && "ring-2 ring-signal",
              )}
            >
              {site?.https === false ? <LockOpen className="size-4" strokeWidth={1.5} /> : <Lock className="size-4" strokeWidth={1.5} />}
            </button>
            <span className={cn("truncate font-sans text-sm", flaggedWhere("url") && "underline decoration-signal decoration-2 underline-offset-4")}>
              {site ? (
                <>
                  {!site.https && <span className="text-paper-muted">Not secure · </span>}
                  <span>{site.domain}</span>
                  <span className="text-paper-muted">/{site.kind === "login" ? "signin" : ""}</span>
                </>
              ) : (
                "…"
              )}
            </span>
          </div>
          <Star aria-hidden className="hidden size-4 text-paper-muted sm:block" strokeWidth={1.5} />

          {info && site && (
            <div role="dialog" aria-label="Site information" className="absolute top-12 left-3 z-10 w-[min(340px,calc(100%-1.5rem))] rounded-[8px] border border-paper-line bg-paper p-4 text-sm shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
              <p className="flex items-center gap-2 font-semibold">
                {site.https ? <ShieldCheck className="size-4" strokeWidth={1.5} /> : <ShieldAlert className="size-4" strokeWidth={1.5} />}
                {site.https ? "Connection is secure" : "Connection is not secure"}
              </p>
              <p className="mt-1 text-paper-muted">
                {site.https ? "Information you send is encrypted in transit. That says nothing about who runs the site." : "Anything you type can be read in transit."}
              </p>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-paper-muted">Domain</dt>
                <dd className="break-all">{site.domain}</dd>
                <dt className="text-paper-muted">Registered</dt>
                <dd className={cn(flaggedWhere("age") && "underline decoration-signal decoration-2")}>{ageLabel(site.domainAgeDays)}</dd>
                <dt className="text-paper-muted">Certificate</dt>
                <dd>{site.https ? `Issued to ${site.domain}` : "None"}</dd>
              </dl>
            </div>
          )}
        </div>

        {/* The page */}
        <div className="max-h-[70dvh] min-h-[480px] overflow-y-auto bg-paper">
          {!site ? (
            <div className="flex min-h-[480px] flex-col items-center justify-center gap-3 text-sm text-paper-muted">
              <RotateCw aria-hidden className="size-5 animate-spin" strokeWidth={1.5} />
              Loading page…
            </div>
          ) : (
            <SitePage site={site} accent={accent} needles={needles} decided={decided} onEngage={() => decide("engaged")} />
          )}
        </div>
      </div>

      {site && !decided && (
        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={() => decide("report")} size="md">
            Leave &amp; report site
          </Button>
          <Button onClick={() => decide("trust")} variant="ghost" size="md">
            This site is fine
          </Button>
          <p className="meta text-smoke">Or use it — sign in, check out, fill the form.</p>
        </div>
      )}

      {site && decision && (
        <Verdict
          grade={gradeDecision(site.scam, decision)}
          scam={site.scam}
          explanation={site.explanation}
          tells={site.tells}
          freestyle={fromFreestyle}
          onNext={() => void next()}
          nextLabel="Next website"
          source={site.source}
        />
      )}
    </div>
  );
}

function SitePage({
  site,
  accent,
  needles,
  decided,
  onEngage,
}: {
  site: SiteEncounter;
  accent: string;
  needles: string[];
  decided: boolean;
  onEngage: () => void;
}) {
  // A plain helper, not a component: components created during render reset every time.
  const h = (text: string) => <Highlight text={text} needles={needles} on={decided} />;

  return (
    <div className="font-sans">
      <header className="flex items-center justify-between gap-4 border-b border-paper-line px-5 py-4 md:px-10">
        <span className="flex items-center gap-2 font-semibold">
          <span aria-hidden className="flex size-7 items-center justify-center rounded-[6px] text-sm text-paper" style={{ background: accent }}>
            {site.brand.charAt(0)}
          </span>
          {site.brand}
        </span>
        <span aria-hidden className="hidden gap-6 text-sm text-paper-muted md:flex">
          <span>Home</span>
          <span>{site.kind === "shop" ? "Shop" : "Services"}</span>
          <span>Help</span>
        </span>
      </header>

      <section className="px-5 py-10 md:px-10 md:py-14" style={{ background: `color-mix(in srgb, ${accent} 7%, transparent)` }}>
        <h1 className="max-w-[24ch] text-3xl leading-tight font-semibold md:text-4xl">
          {h(site.headline)}
        </h1>
        <p className="mt-3 max-w-[56ch] text-paper-muted">
          {h(site.subheadline)}
        </p>
        {site.body.map((b) => (
          <p key={b} className="mt-3 max-w-[60ch]">
            {h(b)}
          </p>
        ))}
        {site.badges.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-2">
            {site.badges.map((b) => (
              <li key={b} className="rounded-full border border-paper-line bg-paper px-3 py-1 text-xs font-medium">
                {h(b)}
              </li>
            ))}
          </ul>
        )}
      </section>

      {site.products.length > 0 && (
        <section className="grid gap-4 px-5 py-8 sm:grid-cols-2 md:px-10 lg:grid-cols-4">
          {site.products.map((p) => (
            <div key={p.name} className="flex flex-col gap-2 rounded-[8px] border border-paper-line p-4">
              <span aria-hidden className="aspect-[4/3] rounded-[6px] bg-paper-2" />
              <span className="font-medium">{p.name}</span>
              <span className="text-sm">
                <span className="font-semibold">
                  {h(p.price)}
                </span>
                {p.was && <span className="ml-2 text-paper-muted line-through">{p.was}</span>}
              </span>
              <button
                type="button"
                onClick={onEngage}
                disabled={decided}
                className="mt-1 min-h-10 rounded-[6px] text-sm font-medium text-paper disabled:opacity-60"
                style={{ background: accent }}
              >
                Add to cart
              </button>
            </div>
          ))}
        </section>
      )}

      {site.formFields.length > 0 && (
        <section className="px-5 py-8 md:px-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onEngage();
            }}
            className="flex max-w-md flex-col gap-4 rounded-[8px] border border-paper-line p-5"
          >
            {site.formFields.map((f) => (
              <label key={f} className="flex flex-col gap-1 text-sm font-medium">
                <span className={cn(decided && needles.some((n) => n.includes(f) || f.includes(n)) && "underline decoration-signal decoration-2 underline-offset-4")}>{f}</span>
                <input
                  disabled={decided}
                  autoComplete="off"
                  type={/password|pin|otp|passcode|cvv/i.test(f) ? "password" : "text"}
                  className="min-h-11 rounded-[6px] border border-paper-line bg-paper px-3 text-base font-normal focus:border-paper-ink focus:outline-none"
                  placeholder={/card/i.test(f) ? "•••• •••• •••• ••••" : ""}
                />
              </label>
            ))}
            <button type="submit" disabled={decided} className="min-h-11 rounded-[6px] font-medium text-paper disabled:opacity-60" style={{ background: accent }}>
              {site.cta}
            </button>
            <p className="text-xs text-paper-muted">Nothing you type leaves this page — it&rsquo;s a simulation.</p>
          </form>
        </section>
      )}

      {site.formFields.length === 0 && site.products.length === 0 && (
        <div className="px-5 pb-10 md:px-10">
          <button type="button" onClick={onEngage} disabled={decided} className="min-h-11 rounded-[6px] px-6 font-medium text-paper" style={{ background: accent }}>
            {site.cta}
          </button>
        </div>
      )}

      <footer className="border-t border-paper-line px-5 py-6 text-xs text-paper-muted md:px-10">
        <p>
          {h(site.contact)}
        </p>
        <p className="mt-1">{site.footer}</p>
      </footer>
    </div>
  );
}
