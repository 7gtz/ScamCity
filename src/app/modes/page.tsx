import type { Metadata } from "next";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { ModeRing } from "@/features/modes/ModeRing";

export const metadata: Metadata = { title: "Play — SCAM CITY" };

export default function ModesPage() {
  return (
    <div className="gutter-x mx-auto flex max-w-[1600px] flex-col gap-8 overflow-x-clip pt-[calc(var(--nav-h)+2.5rem)] pb-24 md:gap-10">
      {/* Compact header: the ring is the page, and it must sit above the fold. */}
      <header className="flex flex-col gap-4">
        <p className="meta text-smoke">Choose how they reach you</p>
        <SplitReveal
          as="h1"
          trigger="load"
          className="display-m uppercase"
          lines={[
            "Every channel",
            <em key="e" className="font-light normal-case text-amber">
              is a door.
            </em>,
          ]}
        />
      </header>
      <ModeRing />
    </div>
  );
}
