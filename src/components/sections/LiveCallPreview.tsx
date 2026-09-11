import { Portrait } from "@/components/motion/Portrait";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { CtaLink } from "@/components/ui/CtaLink";
import { Meter } from "@/components/ui/Meter";
import { DEFAULT_SCENARIO, getScenario } from "@/content/scenarios";
import { Section, SectionMeta } from "./Section";

/** 06 — The page simplifies to the call itself (brief §13). A preview; the real room is /play. */
export function LiveCallPreview() {
  const persona = getScenario(DEFAULT_SCENARIO)!.persona;

  return (
    <Section id="live" className="bg-surface py-[var(--section)]">
      <div className="gutter-x flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-10">
          <SectionMeta id="live" />
          <SplitReveal
            id="live-title"
            className="display-l"
            lines={["Now it’s you", <em key="e" className="font-light normal-case">on the line.</em>]}
          />
        </div>
        <CtaLink href={`/play/${DEFAULT_SCENARIO}`} cursor="talk">
          Take the call
        </CtaLink>
      </div>

      <figure className="mt-16 border-y border-line md:mt-24">
        <figcaption className="sr-only">Preview of the call room during a live call.</figcaption>
        <div aria-hidden inert>
          <div className="gutter-x meta flex h-14 items-center justify-between border-b border-line text-smoke">
            <span>Level 01 · The Bank</span>
            <span className="flex items-center gap-4">
              <span className="flex items-center gap-2 text-signal">
                <span className="live-dot" /> Live
              </span>
              <span className="tabular text-bone">04:17</span>
            </span>
          </div>

          <div className="grid lg:grid-cols-12">
            <Portrait
              src={persona.portrait}
              alt=""
              name={persona.name}
              subject="Caller"
              kenBurns={false}
              direction="left"
              className="h-[48dvh] lg:col-span-5 lg:h-[64dvh]"
              sizes="(min-width: 1024px) 42vw, 100vw"
            />
            <div className="gutter-x flex flex-col justify-between gap-12 py-10 lg:col-span-7">
              <div>
                <p className="font-display text-[clamp(1.5rem,2.6vw,2.5rem)] leading-none tracking-[-0.02em] uppercase">
                  {persona.name}
                </p>
                <p className="meta mt-3 text-smoke">
                  {persona.role} · {persona.organization}
                </p>
              </div>
              <div className="flex flex-col gap-2 self-end text-right">
                <span className="meta text-smoke">You</span>
                <span className="quote max-w-[26ch] text-bone">
                  &ldquo;Can you confirm which department you&rsquo;re calling from?&rdquo;
                </span>
              </div>
            </div>
          </div>

          <div className="gutter-x flex flex-wrap items-center justify-between gap-4 border-t border-line py-4">
            <Meter value={0.64} />
            <span className="flex items-center gap-6">
              <span className="ui-label flex items-center gap-3 text-bone">
                <span className="live-dot" /> Mic active
              </span>
              <span className="ui-label flex h-12 items-center bg-signal px-6 text-ink">End call</span>
            </span>
          </div>
        </div>
      </figure>
    </Section>
  );
}
