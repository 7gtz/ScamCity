import type { Metadata } from "next";
import { CityRain } from "@/components/gl/CityRain";
import { FreestyleConsole } from "@/features/freestyle/FreestyleConsole";

export const metadata: Metadata = { title: "Freestyle — SCAM CITY" };

export default function FreestylePage() {
  return (
    <div data-tone="ember" className="tone-ember relative isolate min-h-dvh overflow-hidden bg-ink">
      {/* The city you're waking up into — your real time and weather. */}
      <CityRain className="absolute inset-0 -z-10 opacity-70" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,var(--color-ink)_25%,transparent_80%)]" />
      <div className="gutter-x mx-auto max-w-[1600px] pt-[calc(var(--nav-h)+5rem)] pb-32">
        <FreestyleConsole />
      </div>
    </div>
  );
}
