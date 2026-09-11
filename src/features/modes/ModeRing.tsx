"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CtaLink } from "@/components/ui/CtaLink";
import { MODES, type Mode } from "@/content/modes";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion/tokens";

const N = MODES.length;
const STEP = 360 / N;
const mod = (i: number) => ((i % N) + N) % N;

/**
 * The mode menu: six plates on a 3D ring. Drag, swipe, use the arrow keys or
 * the buttons to turn it; the plate facing you is the one you enter.
 * Reduced motion gets a flat list with the same links.
 */
export function ModeRing() {
  const reduced = useReducedMotion();
  const router = useRouter();
  const stage = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1200);
  const [viewportH, setViewportH] = useState(900);
  const [turn, setTurn] = useState(0); // unbounded, so the ring always takes the short way round
  const active = MODES[mod(turn)]!;

  const angle = useMotionValue(0);
  const tiltX = useSpring(0, { stiffness: 120, damping: 30 });
  const tiltY = useSpring(0, { stiffness: 120, damping: 30 });
  const rotateY = useTransform(() => angle.get() + tiltY.get());
  const dragFrom = useRef(0);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setWidth(entry.contentRect.width);
      setViewportH(window.innerHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sized by width, and capped by the viewport height so the front plate is never cut off.
  const panelW = Math.round(Math.min(360, Math.max(210, width * 0.42), Math.max(200, (viewportH - 400) / 1.3)));
  const panelH = Math.round(panelW * 1.3);
  const radius = Math.round(panelW / 2 / Math.tan(Math.PI / N) + Math.min(60, width * 0.04));

  const goTo = (next: number) => {
    setTurn(next);
    animate(angle, -next * STEP, { duration: 0.9, ease });
  };

  // Arrow keys turn the ring from anywhere on the page, not only once it has focus.
  useEffect(() => {
    const onWindowKey = (e: KeyboardEvent) => {
      if (e.target !== document.body || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const next = turn + (e.key === "ArrowRight" ? 1 : -1);
      setTurn(next);
      animate(angle, -next * STEP, { duration: 0.9, ease });
    };
    window.addEventListener("keydown", onWindowKey);
    return () => window.removeEventListener("keydown", onWindowKey);
  }, [turn, angle]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") goTo(turn + 1);
    else if (e.key === "ArrowLeft") goTo(turn - 1);
    else if (e.key === "Enter" && e.target === e.currentTarget) router.push(active.href);
    else return;
    e.preventDefault();
  };

  if (reduced) return <FlatModes />;

  return (
    <div className="flex flex-col gap-10">
      <motion.div
        ref={stage}
        role="group"
        aria-roledescription="carousel"
        aria-label="Choose a mode. Use the left and right arrow keys to turn."
        tabIndex={0}
        onKeyDown={onKey}
        className="relative w-full cursor-grab touch-pan-y select-none outline-offset-4 focus-visible:outline-dim active:cursor-grabbing"
        style={{ height: panelH + 60, perspective: 1600 }}
        onPanStart={() => {
          dragFrom.current = angle.get();
        }}
        onPan={(_, info) => angle.set(dragFrom.current + info.offset.x * (STEP / panelW) * 1.2)}
        onPanEnd={() => goTo(Math.round(-angle.get() / STEP))}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          tiltX.set(((e.clientY - r.top) / r.height - 0.5) * -8);
          tiltY.set(((e.clientX - r.left) / r.width - 0.5) * 10);
        }}
        onPointerLeave={() => {
          tiltX.set(0);
          tiltY.set(0);
        }}
      >
        <motion.div
          className="absolute top-8 left-1/2"
          style={{ transformStyle: "preserve-3d", rotateX: tiltX, rotateY, z: -radius }}
        >
          {MODES.map((mode, i) => {
            const delta = mod(i - mod(turn));
            const dist = Math.min(delta, N - delta);
            const signed = delta <= N / 2 ? delta : delta - N;
            return (
              <Plate
                key={mode.id}
                mode={mode}
                front={dist === 0}
                dist={dist}
                // Sized from the plate, not the viewport: "FREESTYLE" must fit a 210px plate.
                titleSize={Math.round(Math.min(56, Math.max(24, panelW * 0.13)))}
                style={{
                  width: panelW,
                  height: panelH,
                  marginLeft: -panelW / 2,
                  transform: `rotateY(${i * STEP}deg) translateZ(${radius}px)`,
                }}
                onFocusSide={() => goTo(turn + signed)}
              />
            );
          })}
        </motion.div>
      </motion.div>

      <div className="flex flex-col gap-6 border-t border-line pt-6 md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-[52ch] flex-col gap-3" aria-live="polite">
          <p className="meta text-smoke">
            {active.number} · {active.kicker}
          </p>
          <p className="lead text-ash">{active.line}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => goTo(turn - 1)}
            aria-label="Previous mode"
            className="flex size-12 items-center justify-center border border-line text-bone transition-colors hover:border-bone"
          >
            <ArrowLeft aria-hidden strokeWidth={1.25} className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => goTo(turn + 1)}
            aria-label="Next mode"
            className="flex size-12 items-center justify-center border border-line text-bone transition-colors hover:border-bone"
          >
            <ArrowRight aria-hidden strokeWidth={1.25} className="size-4" />
          </button>
          <CtaLink href={active.href} className="ml-4">
            Play {active.title}
          </CtaLink>
        </div>
      </div>

      <nav aria-label="All modes">
        <ul className="meta flex flex-wrap gap-x-6 gap-y-2 text-smoke">
          {MODES.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => goTo(turn + ((mod(i - mod(turn)) + N / 2) % N) - N / 2)}
                className={cn("min-h-11 transition-colors hover:text-bone", m.id === active.id && "text-bone")}
              >
                {m.number} {m.title}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function Plate({
  mode,
  front,
  dist,
  titleSize,
  style,
  onFocusSide,
}: {
  mode: Mode;
  front: boolean;
  dist: number;
  titleSize: number;
  style: React.CSSProperties;
  onFocusSide: () => void;
}) {
  return (
    <Link
      href={mode.href}
      draggable={false}
      data-tone={mode.tone}
      tabIndex={front ? 0 : -1}
      aria-hidden={!front || undefined}
      onClick={(e) => {
        if (!front) {
          e.preventDefault();
          onFocusSide();
        }
      }}
      data-cursor={front ? "enter" : undefined}
      className={cn(
        "absolute top-0 flex flex-col justify-between overflow-hidden border p-5 [backface-visibility:hidden] md:p-8",
        "bg-[radial-gradient(ellipse_at_30%_15%,var(--color-raised)_0%,var(--color-surface)_60%,var(--color-ink)_100%)]",
        // Each channel has its own light: paper for everyday apps, amber for Freestyle.
        mode.tone !== "dark" && `tone-${mode.tone} text-bone`,
        "transition-[opacity,border-color] duration-[900ms] ease-out",
        front ? "border-dim" : "border-line",
        dist === 0 ? "opacity-100" : dist === 1 ? "opacity-60" : "opacity-25",
      )}
      style={style}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-[0.05em] -bottom-[0.22em] font-display text-[9rem] leading-none font-light text-bone/[0.06] italic md:text-[12rem]"
      >
        {mode.number}
      </span>
      <span className="meta flex items-center justify-between text-smoke">
        <span>{mode.id === "freestyle" ? "Every district · every channel" : `Channel · ${mode.channel}`}</span>
        {mode.id === "freestyle" && <span className="live-dot" aria-hidden />}
      </span>
      <span className="relative flex flex-col gap-3">
        <span className="meta text-ash">{mode.kicker}</span>
        <span className="font-display leading-none tracking-[-0.02em] uppercase" style={{ fontSize: titleSize }}>
          {mode.title}
        </span>
      </span>
    </Link>
  );
}

function FlatModes() {
  return (
    <ul className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
      {MODES.map((m) => (
        <li key={m.id} className="bg-ink">
          <Link href={m.href} className="flex min-h-56 flex-col justify-between gap-8 p-6 hover:bg-surface">
            <span className="meta text-smoke">
              {m.number} · {m.channel}
            </span>
            <span className="flex flex-col gap-2">
              <span className="font-display text-4xl leading-none uppercase">{m.title}</span>
              <span className="text-ash">{m.line}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
