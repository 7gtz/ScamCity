import { Reveal } from "@/components/motion/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { CtaLink } from "@/components/ui/CtaLink";
import { RiddlePlayer } from "@/features/riddle/RiddlePlayer";
import { Section, SectionMeta } from "./Section";

/** 08 + 08b — Pattern recognition first; then the case for verification over paranoia (brief §16–17). */
export function RiddleSection() {
  return (
    <Section id="riddle" className="gutter-x py-[var(--section)]">
      <div className="mb-20 flex flex-col gap-10 md:mb-28">
        <SectionMeta id="riddle" />
        <SplitReveal
          id="riddle-title"
          className="display-l"
          lines={[
            "Before you enter",
            "the call,",
            <em key="a" className="font-light normal-case">learn to see</em>,
            <em key="b" className="font-light normal-case">the trap.</em>,
          ]}
        />
      </div>

      <RiddlePlayer />

      <div className="mt-[var(--section)] grid gap-16 border-t border-line pt-16 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-8 lg:col-span-6">
          <SplitReveal as="h3" className="display-m uppercase" lines={["Not everything", "is a scam."]} />
          <SplitReveal
            as="p"
            className="display-m font-light text-ash italic"
            lines={["The goal isn’t paranoia.", "It’s verification."]}
          />
        </div>

        <Reveal className="flex flex-col gap-6 lg:col-span-5 lg:col-start-8">
          <p data-reveal className="meta text-smoke">
            A legitimate call
          </p>
          <p data-reveal className="quote text-bone">
            &ldquo;We&rsquo;ve paused a card payment. I won&rsquo;t ask for your PIN or any codes — please call the
            number on the back of your card.&rdquo;
          </p>
          <div data-reveal className="flex flex-col gap-2 border-t border-line pt-6">
            <p className="meta text-smoke">Right response</p>
            <p className="lead text-ash">
              Don&rsquo;t hang up in a panic. Don&rsquo;t comply either. Call back on a number you already trust.
            </p>
          </div>
          <div data-reveal>
            <CtaLink href="/play/card-alert" cursor="talk">
              Take the legitimate call
            </CtaLink>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
