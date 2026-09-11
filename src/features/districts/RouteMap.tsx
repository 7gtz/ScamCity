"use client";

import { Check, Lock, Maximize2 } from "lucide-react";
import { motion, useMotionTemplate, useReducedMotion, useTransform, type MotionValue } from "motion/react";
import { BONUS, DISTRICTS } from "@/content/districts";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion/tokens";
import { useCityProgress, type MapKey } from "./CityMap";
import { ROUTE_LENGTH, ROUTE_PATH, ROUTE_SEGMENTS, routeAt, SPUR } from "./geometry";

const STOPS = DISTRICTS.map((_, i) => i);
const HUES = DISTRICTS.map((d) => d.hueText);

/** Label placement around a node; the node itself sits at the list item's origin. */
const PLACE = {
  above: "bottom-3.5 left-1/2 -translate-x-1/2",
  below: "top-3.5 left-1/2 -translate-x-1/2",
  left: "right-3.5 top-1/2 -translate-y-1/2",
} as const;

type Props = {
  /** 0 = first district … 5 = last; fractional while a wipe is under way. */
  progress: MotionValue<number>;
  active: number;
  /** Go to a district (scrolls the pinned section there). */
  onSelect: (i: number) => void;
  /** Open the full-screen map pointing at a place. */
  onOpen: (key: MapKey) => void;
  className?: string;
};

/**
 * The districts section's map. Its pointer rides the section's scroll: it
 * glides along the real route from district to district, the road behind it
 * lights up in each district's colour, and a halftone dot matrix lies over the
 * map, brightest where the pointer is. Every place is a control.
 */
export function RouteMap({ progress, active, onSelect, onOpen, className }: Props) {
  const reduced = useReducedMotion();
  const { statusOf, bonusStatus } = useCityProgress();

  const x = useTransform(progress, (p) => routeAt(p).x);
  const y = useTransform(progress, (p) => routeAt(p).y);
  const travelled = useTransform(progress, (p) => Math.max(0.001, routeAt(p).length / ROUTE_LENGTH));
  const hue = useTransform(progress, STOPS, HUES);
  const px = useTransform(x, (v) => v / 8);
  const py = useTransform(y, (v) => v / 5);
  const dots = useMotionTemplate`radial-gradient(circle, ${hue} 1.1px, transparent 1.8px)`;
  const light = useMotionTemplate`radial-gradient(ellipse 36% 56% at ${px}% ${py}%, #000 0%, rgb(0 0 0 / 0.45) 55%, rgb(0 0 0 / 0.2) 100%)`;
  const d = DISTRICTS[active]!;

  return (
    <motion.div
      className={cn("flex-col gap-3", className)}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.9, ease }}
    >
      <div className="relative aspect-[8/5] w-full overflow-hidden border border-line bg-surface/70">
        <svg aria-hidden viewBox="0 0 800 500" className="absolute inset-0 size-full">
          <path
            d="M-20 470 C 180 430, 260 470, 380 440 S 620 330, 820 360"
            fill="none"
            stroke="var(--color-raised)"
            strokeWidth="26"
            strokeLinecap="round"
          />
          <polyline points={SPUR} fill="none" stroke="var(--color-dim)" strokeWidth="2.5" strokeDasharray="2 8" strokeLinecap="round" />
          {ROUTE_SEGMENTS.map((points, i) => (
            <motion.polyline
              key={points}
              points={points}
              fill="none"
              stroke="var(--color-dim)"
              strokeWidth="3"
              strokeDasharray="7 7"
              strokeLinejoin="round"
              initial={reduced ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.15 }}
            />
          ))}
          {/* The road travelled so far, in the light of each district passed. */}
          <motion.path
            d={ROUTE_PATH}
            fill="none"
            stroke={hue}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ pathLength: travelled }}
          />
          <circle cx={BONUS.map.x} cy={BONUS.map.y} r="7" fill="var(--color-ink)" stroke="var(--color-dim)" strokeWidth="2.5" />
          {DISTRICTS.map((district, i) => {
            const status = statusOf(i);
            return (
              <circle
                key={district.id}
                cx={district.map.x}
                cy={district.map.y}
                r="10"
                strokeWidth="3"
                className="transition-[fill,stroke] duration-500"
                fill={status === "cleared" ? "var(--color-bone)" : "var(--color-ink)"}
                stroke={i === active ? district.hueText : status === "locked" ? "var(--color-dim)" : "var(--color-ash)"}
              />
            );
          })}
          {/* The pointer. */}
          {!reduced && (
            <motion.circle
              cx={x}
              cy={y}
              r="22"
              fill="none"
              stroke={hue}
              strokeWidth="2"
              className="animate-[map-pulse_2.4s_var(--ease-out)_infinite]"
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            />
          )}
          <motion.circle cx={x} cy={y} r="8" fill={hue} stroke="var(--color-ink)" strokeWidth="4" />
        </svg>

        {/* The dot matrix: a translucent halftone over the whole map, lit around the pointer. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{ backgroundImage: dots, backgroundSize: "9px 9px", maskImage: light, WebkitMaskImage: light }}
        />

        <ol aria-label="Districts on the map" className="absolute inset-0">
          {DISTRICTS.map((district, i) => {
            const status = statusOf(i);
            const on = i === active;
            const name = `District ${district.number}, ${district.title}${status === "locked" ? ", locked" : status === "cleared" ? ", cleared" : ""}`;
            return (
              <li key={district.id} className="absolute" style={{ left: `${district.map.x / 8}%`, top: `${district.map.y / 5}%` }}>
                {/* The node itself is a target too. */}
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  onClick={() => onSelect(i)}
                  className="absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full"
                />
                <button
                  type="button"
                  onClick={() => onSelect(i)}
                  aria-label={name}
                  aria-current={on ? "true" : undefined}
                  data-cursor="magnetic"
                  className={cn(
                    "absolute flex items-center gap-1.5 bg-ink/85 px-2 py-1 whitespace-nowrap transition-colors duration-[320ms]",
                    "outline-offset-2 focus-visible:outline-2 focus-visible:outline-bone",
                    PLACE[district.map.label],
                    on ? "text-bone" : "text-ash hover:text-bone",
                  )}
                >
                  <span className="meta text-[0.6875rem] transition-colors duration-[320ms]" style={{ color: on ? district.hueText : undefined }}>
                    {district.number}
                  </span>
                  <span className="text-[0.8125rem] font-medium tracking-[0.06em] uppercase">{district.title.replace(/^The /, "")}</span>
                  {status === "locked" && <Lock aria-hidden strokeWidth={1.5} className="size-3 text-dim" />}
                  {status === "cleared" && <Check aria-hidden strokeWidth={2} className="size-3 text-safe" />}
                </button>
              </li>
            );
          })}
          <li className="absolute" style={{ left: `${BONUS.map.x / 8}%`, top: `${BONUS.map.y / 5}%` }}>
            <button
              type="button"
              onClick={() => onOpen("bonus")}
              aria-label={`Bonus call, ${BONUS.title}${bonusStatus === "locked" ? ", locked" : ""}. Opens the full map.`}
              className={cn(
                "absolute flex items-center gap-1.5 bg-ink/85 px-2 py-1 whitespace-nowrap text-smoke transition-colors hover:text-bone",
                "outline-offset-2 focus-visible:outline-2 focus-visible:outline-bone",
                PLACE[BONUS.map.label],
              )}
            >
              <span className="meta text-[0.6875rem] text-safe">B</span>
              <span className="text-[0.75rem] tracking-[0.06em] uppercase">Bonus</span>
            </button>
          </li>
        </ol>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p aria-live="polite" className="meta min-w-0 truncate text-smoke">
          <span className="transition-colors duration-[320ms]" style={{ color: d.hueText }}>
            District {d.number}
          </span>{" "}
          · {d.title} · Runs on {d.lever.toLowerCase()}
        </p>
        <button
          type="button"
          onClick={() => onOpen(d.id)}
          className="meta flex min-h-11 shrink-0 items-center gap-2 px-1 text-ash transition-colors hover:text-bone"
          data-cursor="magnetic"
        >
          <Maximize2 aria-hidden strokeWidth={1.5} className="size-3.5" /> Full map
        </button>
      </div>
    </motion.div>
  );
}
