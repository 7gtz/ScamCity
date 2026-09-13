import Link from "next/link";
import { CityRain } from "@/components/gl/CityRain";
import { Reveal } from "@/components/motion/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Button } from "@/components/ui/Button";
import { CtaLink } from "@/components/ui/CtaLink";
import { Section } from "./Section";

/**
 * Curiosity first; explain nothing yet (brief §8). The first action is the
 * game itself: wake up in Freestyle, or take one call.
 */
export function Opening() {
  return (
    <Section
      id="opening"
      className="gutter-x isolate flex min-h-dvh flex-col justify-between overflow-hidden pt-[calc(var(--nav-h)+1.5rem)] pb-10 md:pb-14"
    >
      {/* The player's real evening, through a wet window. */}
      <CityRain caption className="absolute inset-0 -z-10" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,var(--color-ink)_8%,transparent_55%)]" />
      <p className="meta text-smoke">A social-engineering training system</p>

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
          <p data-reveal className="lead max-w-[34ch] text-ash">
            An AI is trying to convince you of something. It learns what works on you.
          </p>
          <div data-reveal className="flex flex-col gap-4 md:items-end">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <Button asChild>
                <Link href="/freestyle" data-cursor="enter">
                  Wake up
                </Link>
              </Button>
              <CtaLink href="#incoming">Or take one call</CtaLink>
            </div>
            {/* Full navigation keeps the disposable preview store out of campaign memory. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/city/bank-branch?demo=1" className="meta min-h-11 content-center text-smoke transition-colors hover:text-bone">
              Judging? The 20–30 second case demo →
            </a>
            <Link href="/freestyle?demo=1" className="meta min-h-11 content-center text-smoke transition-colors hover:text-bone">
              Or the three-minute freestyle demo →
            </Link>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
