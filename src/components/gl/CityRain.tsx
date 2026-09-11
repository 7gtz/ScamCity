"use client";

import { useEffect, useRef, useState } from "react";
import { useFreestyle } from "@/features/freestyle/freestyle-store";
import { cn } from "@/lib/cn";
import { describeContext, getRealWorldContext } from "@/lib/live/real-world";
import { ShaderCanvas } from "./ShaderCanvas";
import { CITY_RAIN } from "./shaders";

type Ambience = { night: number; rain: number; label: string | null };

/**
 * The player's real evening, as shader parameters: local time sets the sky,
 * real weather (only if location was already granted — this never prompts)
 * sets how wet the glass is.
 */
function useAmbience(): Ambience {
  const [ambience, setAmbience] = useState<Ambience>({ night: 1, rain: 0.35, label: null });

  useEffect(() => {
    let alive = true;
    void (async () => {
      const hour = new Date().getHours();
      const night = hour >= 19 || hour < 6 ? 1 : hour >= 17 ? 0.65 : 0.15;
      let ctx = useFreestyle.getState().context;
      if (!ctx?.weather) {
        try {
          const permission = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
          if (permission?.state === "granted") ctx = await getRealWorldContext(true);
        } catch {
          // permissions API unavailable: time of day only
        }
      }
      ctx ??= await getRealWorldContext(false);
      const w = ctx.weather ?? "";
      const rain = /rain|drizzle|shower|thunder/.test(w) ? 0.9 : /cloud|fog/.test(w) ? 0.45 : w ? 0.12 : 0.35;
      if (alive) setAmbience({ night, rain, label: describeContext(ctx) });
    })();
    return () => {
      alive = false;
    };
  }, []);

  return ambience;
}

/** Rain on glass over city lights. `caption` shows the live conditions it was rendered for. */
export function CityRain({ className, caption = false }: { className?: string; caption?: boolean }) {
  const ambience = useAmbience();
  const ref = useRef(ambience);
  useEffect(() => {
    ref.current = ambience;
  });

  return (
    <div
      aria-hidden
      className={cn("overflow-hidden", className)}
      // Fallback when WebGL is unavailable: a warm horizon glow.
      style={{ background: "radial-gradient(ellipse at 50% 115%, color-mix(in srgb, var(--color-amber) 22%, var(--color-ink)) 0%, var(--color-ink) 62%)" }}
    >
      <ShaderCanvas fragment={CITY_RAIN} resolution={0.6} uniforms={() => ({ uRain: ref.current.rain, uNight: ref.current.night })} />
      {caption && ambience.label && (
        // Phones: its own line under the section tag. Wider: top-right, opposite the tag.
        <p className="meta absolute top-[calc(var(--nav-h)+3.5rem)] left-[var(--gutter)] flex items-center gap-2 text-ash sm:top-[calc(var(--nav-h)+1.5rem)] sm:right-[var(--gutter)] sm:left-auto">
          <span className="size-1.5 rounded-full bg-amber" />
          Live · {ambience.label}
        </p>
      )}
    </div>
  );
}
