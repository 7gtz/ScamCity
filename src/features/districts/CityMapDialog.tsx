"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { BONUS, DISTRICTS } from "@/content/districts";
import { RIDDLES_TO_UNLOCK } from "@/features/progress/progress-store";
import { cn } from "@/lib/cn";
import { getLenis } from "@/lib/motion/lenis";
import { ease, exit } from "@/lib/motion/tokens";
import { CityMap, STATUS_WORD, useCityProgress, type MapKey } from "./CityMap";

/**
 * The city map as a full-screen overlay, pointing at one place (`focus`).
 * Opened from the district plates on the landing page; arrows or a click on
 * the map move the pointer, and the panel follows it.
 */
export function CityMapDialog({ focus, onClose }: { focus: MapKey | null; onClose: () => void }) {
  const reduced = useReducedMotion();
  const open = focus !== null;

  useEffect(() => {
    if (!open) return;
    const lenis = getLenis();
    lenis?.stop();
    return () => lenis?.start();
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        {focus && (
          <Dialog.Portal forceMount>
            <Dialog.Content forceMount asChild aria-describedby={undefined}>
              <motion.div
                className="gutter-x fixed inset-0 z-[85] flex flex-col overflow-y-auto bg-ink"
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, transition: exit }}
                transition={{ duration: 0.5, ease }}
              >
                {/* Remounts per opening, so the pointer starts where it was asked to. */}
                <MapBody initial={focus} />
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function MapBody({ initial }: { initial: MapKey }) {
  const [viewing, setViewing] = useState<MapKey>(initial);
  const { statusOf, bonusStatus } = useCityProgress();
  const i = DISTRICTS.findIndex((d) => d.id === viewing);
  const d = DISTRICTS[i];
  const status = d ? statusOf(i) : bonusStatus;
  const locked = status === "locked";
  const prev = i > 0 ? DISTRICTS[i - 1] : undefined;
  const href = `/play/${d?.scenarioId ?? BONUS.scenarioId}`;

  const step = (n: number) => {
    const from = i < 0 ? 0 : i;
    setViewing(DISTRICTS[(from + n + DISTRICTS.length) % DISTRICTS.length]!.id);
  };

  return (
    <div
      className="flex min-h-full flex-col"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") step(1);
        else if (e.key === "ArrowLeft") step(-1);
        else return;
        e.preventDefault();
      }}
    >
      <div className="flex h-[var(--nav-h)] shrink-0 items-center justify-between border-b border-line">
        <Dialog.Title className="meta text-smoke">The city map</Dialog.Title>
        <Dialog.Close className="meta flex min-h-11 items-center px-2 text-bone" data-cursor="magnetic">
          Close
        </Dialog.Close>
      </div>

      <div className="grid flex-1 content-center gap-12 py-10 lg:grid-cols-12 lg:items-center lg:gap-8">
        <CityMap focus={viewing} onSelect={setViewing} className="lg:col-span-8" />

        <section
          aria-live="polite"
          aria-label="Selected place"
          style={{ "--hue-text": d?.hueText ?? "var(--color-safe)" } as React.CSSProperties}
          className="flex flex-col gap-5 lg:col-span-4"
        >
          <p className="meta text-[color:var(--hue-text)]">
            {d ? `District ${d.number} · Runs on ${d.lever.toLowerCase()}` : "Bonus call · Off the route"}
          </p>
          <h2 className="display-m uppercase">{d?.title ?? BONUS.title}</h2>
          <p className="lead max-w-[36ch] text-ash">{d?.line ?? BONUS.alert}</p>
          <p className={cn("meta", status === "current" ? "text-signal" : status === "cleared" ? "text-safe" : "text-smoke")}>
            {STATUS_WORD[status]}
          </p>
          {locked ? (
            <p className="max-w-[36ch] text-sm leading-relaxed text-smoke">
              {d && prev
                ? `Clear District ${prev.number} · ${prev.title} to open it.`
                : `Clear the Bank or solve ${RIDDLES_TO_UNLOCK} riddles to open it.`}
            </p>
          ) : (
            <Button asChild className="self-start" data-cursor="enter">
              <Link href={href}>{d ? "Enter the district" : "Take the bonus call"}</Link>
            </Button>
          )}
          <div className="flex items-center gap-3 border-t border-line pt-5">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous district"
              className="flex size-12 items-center justify-center border border-line text-bone transition-colors hover:border-bone"
            >
              <ArrowLeft aria-hidden strokeWidth={1.25} className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next district"
              className="flex size-12 items-center justify-center border border-line text-bone transition-colors hover:border-bone"
            >
              <ArrowRight aria-hidden strokeWidth={1.25} className="size-4" />
            </button>
            <span className="meta ml-2 hidden text-smoke sm:inline">Or pick a place on the map</span>
          </div>
        </section>
      </div>
    </div>
  );
}
