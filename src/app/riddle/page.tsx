import type { Metadata } from "next";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { CtaLink } from "@/components/ui/CtaLink";
import { RiddlePlayer } from "@/features/riddle/RiddlePlayer";

export const metadata: Metadata = { title: "Riddle Mode — SCAM CITY" };

export default function RiddlePage() {
  return (
    <div className="gutter-x mx-auto flex max-w-[1600px] flex-col gap-20 pt-[calc(var(--nav-h)+5rem)] pb-32 md:gap-28">
      <header className="flex flex-col gap-8">
        <p className="meta text-smoke">Riddle Mode · Training</p>
        <SplitReveal
          as="h1"
          trigger="load"
          className="display-l"
          lines={["Before you enter", "the call,", <em key="l" className="font-light normal-case">learn to see the trap.</em>]}
        />
      </header>

      <RiddlePlayer />

      <footer className="flex flex-col gap-6 border-t border-line pt-8 md:flex-row md:items-center md:justify-between">
        <p className="lead max-w-[46ch] text-ash">Pattern recognition first. Then someone calls you.</p>
        <CtaLink href="/play">Take a live call</CtaLink>
      </footer>
    </div>
  );
}
