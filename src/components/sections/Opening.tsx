import { Reveal } from "@/components/motion/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { CtaLink } from "@/components/ui/CtaLink";
import { Section } from "./Section";

/** 01 — Curiosity first; explain nothing yet (brief §8). */
export function Opening() {
  return (
    <Section
      id="opening"
      className="gutter-x flex min-h-dvh flex-col justify-between pt-[calc(var(--nav-h)+1.5rem)] pb-10 md:pb-14"
    >
      <p className="meta text-smoke">Training system / 01</p>

      <div className="flex flex-col gap-10 md:gap-14">
        <SplitReveal
          as="h1"
          id="opening-title"
          trigger="load"
          delay={0.25}
          className="display-xl"
          lines={["You're", "already", "on the call."]}
        />

        <Reveal trigger="load" delay={1.2} className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <p data-reveal className="lead max-w-[30ch] text-ash">
            An AI is trying to convince you of something.
          </p>
          <div data-reveal>
            <CtaLink href="#incoming">Enter the city</CtaLink>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
