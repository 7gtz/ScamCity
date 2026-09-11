"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { gsap } from "@/lib/motion/gsap";

type CursorMode = "default" | "magnetic" | "enter" | "talk" | "view";

const LABELS: Partial<Record<CursorMode, string>> = { enter: "Enter", talk: "Talk", view: "View" };
const MAGNET_STRENGTH = 0.25;
const MAGNET_MAX = 8;

const clamp = (v: number) => Math.max(-MAGNET_MAX, Math.min(MAGNET_MAX, v));

/**
 * Custom cursor (MASTER §5). Fine pointers only, never under reduced motion.
 * Opt in with data-cursor="magnetic" | "enter" | "talk" | "view".
 * Inverts over light tones ([data-tone="paper" | "amber"]).
 */
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  // Hover state is tied to the route it was measured on, so a label never
  // survives a navigation (e.g. TALK carried from the call room to results).
  const pathname = usePathname();
  const [hover, setHover] = useState<{ mode: CursorMode; path: string }>({ mode: "default", path: "" });
  const mode = hover.path === pathname ? hover.mode : "default";
  const [visible, setVisible] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [light, setLight] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const update = () => setEnabled(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;

    const root = document.documentElement;
    root.classList.add("has-custom-cursor");
    const xTo = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });
    let magnet: HTMLElement | null = null;
    let lastX = -1;
    let lastY = -1;
    let raf = 0;

    const release = () => {
      if (!magnet) return;
      gsap.to(magnet, { x: 0, y: 0, duration: 0.6 });
      magnet = null;
    };

    /** Everything the cursor shows depends only on what sits under it. */
    const read = (node: Element | null) => {
      const overField = Boolean(node?.closest("input, textarea, select"));
      setVisible(lastX >= 0 && !overField);
      const tone = node?.closest<HTMLElement>("[data-tone]")?.dataset.tone;
      setLight(tone === "paper" || tone === "amber");
      const target = node?.closest<HTMLElement>("[data-cursor]") ?? null;
      const next = (target?.dataset.cursor as CursorMode | undefined) ?? "default";
      const path = window.location.pathname;
      setHover((h) => (h.mode === next && h.path === path ? h : { mode: next, path }));
      return { target, next };
    };

    const onMove = (e: PointerEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      xTo(e.clientX);
      yTo(e.clientY);
      const { target, next } = read(e.target instanceof Element ? e.target : null);

      // The call room gets labels but never attraction.
      const magnetic = target && next !== "talk" ? target : null;
      if (magnetic !== magnet) release();
      if (!magnetic) return;

      magnet = magnetic;
      const r = magnetic.getBoundingClientRect();
      const offsetX = Number(gsap.getProperty(magnetic, "x")) || 0;
      const offsetY = Number(gsap.getProperty(magnetic, "y")) || 0;
      const cx = r.left - offsetX + r.width / 2;
      const cy = r.top - offsetY + r.height / 2;
      gsap.to(magnetic, {
        x: clamp((e.clientX - cx) * MAGNET_STRENGTH),
        y: clamp((e.clientY - cy) * MAGNET_STRENGTH),
        duration: 0.4,
      });
    };

    // What's under a still pointer changes when the page scrolls, or when the
    // element that was under it unmounts after a click — re-read it then, so no
    // stale "ENTER" label floats over empty space.
    const recheck = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (lastX < 0) return;
        const { target } = read(document.elementFromPoint(lastX, lastY));
        if (magnet && target !== magnet) release();
      });
    };
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const onClick = () => {
      for (const ms of [60, 450]) {
        const t = setTimeout(() => {
          timers.delete(t);
          recheck();
        }, ms);
        timers.add(t);
      }
    };

    const onLeave = () => {
      setVisible(false);
      release();
    };
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", recheck, { passive: true });
    window.addEventListener("click", onClick);
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    return () => {
      root.classList.remove("has-custom-cursor");
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", recheck);
      window.removeEventListener("click", onClick);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      release();
    };
  }, [enabled]);

  if (!enabled) return null;

  const label = LABELS[mode];

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none fixed top-0 left-0 z-[95] transition-opacity duration-[180ms] ease-out", light && "tone-paper")}
      style={{ opacity: visible ? 1 : 0 }}
    >
      <span
        className={cn(
          "absolute top-0 left-0 block size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bone",
          "transition-transform duration-[320ms] ease-out",
          label && "scale-0",
          mode === "magnetic" && "scale-[1.7]",
          pressed && "scale-50",
        )}
      />
      <span
        className={cn(
          "meta absolute top-0 left-0 flex h-7 -translate-y-1/2 items-center bg-bone px-2.5 whitespace-nowrap text-ink",
          "origin-left transition-[transform,opacity] duration-[320ms] ease-out",
          label ? "translate-x-3 scale-100 opacity-100" : "translate-x-1 scale-75 opacity-0",
        )}
      >
        {label}
      </span>
    </div>
  );
}
