import { Reveal } from "@/components/motion/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Section, SectionMeta } from "./Section";

const AUDIENCES = ["Schools", "Community centers", "Elder-care programs", "Financial literacy", "Corporate training"];

/** 10 — Warmer ground; the skill outlives the game (brief §20). */
export function Impact() {
  return (
    <Section id="impact" tone="paper" className="bg-surface py-[var(--section)]">
      <div className="gutter-x grid gap-16 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-10 lg:col-span-6">
          <SectionMeta id="impact" />
          <SplitReveal
            id="impact-title"
            className="display-l"
            lines={["The skill should", <em key="e" className="font-light normal-case">travel with you.</em>]}
          />
          <p className="lead max-w-[40ch] text-ash">
            SCAM CITY isn&rsquo;t only a game. It is experiential social-engineering training — practice under pressure,
            for the people most often targeted.
          </p>
        </div>

        <Reveal as="ul" className="self-end lg:col-span-5 lg:col-start-8" stagger={0.1}>
          {AUDIENCES.map((a) => (
            <li
              key={a}
              data-reveal
              className="border-t border-line py-4 font-display text-[clamp(1.75rem,3.4vw,3rem)] leading-none tracking-[-0.02em] text-ash uppercase last:border-b"
            >
              {a}
            </li>
          ))}
        </Reveal>
      </div>
    </Section>
  );
}
