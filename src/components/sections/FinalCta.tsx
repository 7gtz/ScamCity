import { CityRain } from "@/components/gl/CityRain";
import { Reveal } from "@/components/motion/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { CtaLink } from "@/components/ui/CtaLink";
import { Section } from "./Section";

/** 11 — Back to near-black. Very little UI (brief §21). */
export function FinalCta() {
  return (
    <Section id="enter" className="gutter-x isolate flex min-h-dvh flex-col justify-between overflow-hidden pt-[var(--section)] pb-10">
      {/* The page ends where it began: the same wet window, dimmer. */}
      <CityRain className="absolute inset-0 -z-10 opacity-45" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,var(--color-ink)_20%,transparent_85%)]" />
      <div className="flex flex-1 flex-col items-center justify-center gap-14 text-center">
        <p className="meta text-smoke">Scam City</p>
        <h2 id="enter-title" className="flex flex-col items-center gap-[0.4em]">
          <SplitReveal as="div" className="display-l" lines={["Don’t learn", "the red flags."]} />
          <SplitReveal
            as="div"
            delay={0.3}
            className="display-l font-light normal-case italic"
            lines={["Learn", "to think", "under pressure."]}
          />
        </h2>
        <Reveal delay={0.6}>
          <div data-reveal>
            <CtaLink href="/modes">Enter the city</CtaLink>
          </div>
        </Reveal>
      </div>

      <footer className="meta flex flex-col gap-2 border-t border-line pt-6 text-smoke sm:flex-row sm:justify-between">
        <span>AI-driven social engineering training</span>
        <span>2026</span>
      </footer>
    </Section>
  );
}
