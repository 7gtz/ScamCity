"use client";

import Image from "next/image";
import { useRef } from "react";
import { HalftonePortrait } from "@/components/gl/HalftonePortrait";
import { cn } from "@/lib/cn";
import { gsap, MQ, useGSAP } from "@/lib/motion/gsap";

type Props = {
  /** A real photo. Without one, a generative halftone silhouette seeded from `name`. */
  src?: string;
  alt: string;
  /** Seeds the generative silhouette and labels the caption. */
  name: string;
  subject?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  direction?: "up" | "left";
  trigger?: "load" | "scroll";
  delay?: number;
  kenBurns?: boolean;
  /** Pulse with the live call's audio level (call room only). */
  reactive?: boolean;
  /** The district's light for the generative silhouette (#rrggbb). */
  tint?: string;
};

const START = { up: "inset(100% 0% 0% 0%)", left: "inset(0% 100% 0% 0%)" } as const;

/** Clip-path wipe, counter-scale, then Ken Burns (MASTER §4.2–4.3, §8). */
export function Portrait({
  src,
  alt,
  name,
  subject = "Subject",
  className,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  priority,
  direction = "up",
  trigger = "scroll",
  delay = 0,
  kenBurns = true,
  reactive = false,
  tint,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        const inner = el.querySelector("[data-wipe-inner]");
        const drift = el.querySelector("[data-drift]");
        gsap
          .timeline({
            delay,
            scrollTrigger: trigger === "scroll" ? { trigger: el, start: "top 80%", once: true } : undefined,
          })
          .fromTo(el, { clipPath: START[direction] }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4 })
          .fromTo(inner, { scale: 1.15 }, { scale: 1, duration: 1.4 }, "<")
          .call(() => {
            if (kenBurns) drift?.classList.add("ken-burns");
          });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      data-wipe={direction}
      style={tint ? ({ "--tint": tint } as React.CSSProperties) : undefined}
      className={cn("relative overflow-hidden bg-ember", className)}
    >
      <div data-wipe-inner className="absolute inset-0">
        <div data-drift className="absolute inset-0">
          {src ? (
            <Image
              src={src}
              alt={alt}
              fill
              sizes={sizes}
              priority={priority}
              className="object-cover [filter:saturate(0.75)_contrast(0.95)_brightness(0.95)]"
            />
          ) : (
            <div role="img" aria-label={alt} className="absolute inset-0">
              <HalftonePortrait seed={name} reactive={reactive} tint={tint} />
            </div>
          )}
        </div>
      </div>

      {/* Vignette sinks the image into the ground. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_58%,var(--color-ink)_100%)]"
      />

      {!src && (
        <div aria-hidden className="pointer-events-none absolute inset-4 md:inset-6">
          <span className="absolute top-0 left-0 size-4 border-t border-l border-[color:var(--tint,var(--color-amber))] opacity-50" />
          <span className="absolute top-0 right-0 size-4 border-t border-r border-[color:var(--tint,var(--color-amber))] opacity-50" />
          <span className="absolute bottom-0 left-0 size-4 border-b border-l border-[color:var(--tint,var(--color-amber))] opacity-50" />
          <span className="absolute right-0 bottom-0 size-4 border-r border-b border-[color:var(--tint,var(--color-amber))] opacity-50" />
          <span className="meta absolute bottom-6 left-6 flex flex-col gap-1 text-ash">
            <span>
              {subject} · {name}
            </span>
            <span className="text-[color:var(--tint,var(--color-amber))]">Identity unverified</span>
          </span>
        </div>
      )}
    </div>
  );
}
