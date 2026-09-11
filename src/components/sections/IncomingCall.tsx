import Link from "next/link";
import { Portrait } from "@/components/motion/Portrait";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import { DEFAULT_SCENARIO, getScenario } from "@/content/scenarios";
import { RingTimer } from "./RingTimer";
import { Section, SectionMeta } from "./Section";

/** 02 — A believable caller. The danger is that he looks legitimate (brief §9, §24). */
export function IncomingCall() {
  const persona = getScenario(DEFAULT_SCENARIO)!.persona;

  return (
    <Section id="incoming" tone="ember" className="grid min-h-dvh grid-cols-1 lg:grid-cols-12">
      <Portrait
        src={persona.portrait}
        alt={`${persona.name}, the caller`}
        name={persona.name}
        subject="Caller"
        className="h-[58dvh] md:h-[66dvh] lg:col-span-7 lg:h-auto lg:min-h-dvh"
        sizes="(min-width: 1024px) 58vw, 100vw"
      />

      <div className="gutter-x flex flex-col justify-between gap-16 py-12 lg:col-span-5 lg:py-[var(--section)]">
        <SectionMeta id="incoming" className="hidden lg:block" />

        <Reveal className="flex flex-col gap-10" stagger={0.12}>
          <div data-reveal className="meta flex items-center justify-between text-ash">
            <span className="flex items-center gap-3">
              <span aria-hidden className="live-dot" /> Incoming call
            </span>
            <RingTimer className="tabular text-bone" />
          </div>

          <div data-reveal className="flex flex-col gap-3 border-t border-line pt-6">
            <p className="meta text-smoke">Unknown</p>
            <h2 id="incoming-title" className="display-m uppercase">
              {persona.name}
            </h2>
            <p className="meta flex flex-col gap-1 text-ash">
              <span>{persona.role}</span>
              <span>{persona.organization}</span>
            </p>
          </div>

          <div data-reveal className="flex flex-col gap-4">
            <Button asChild className="self-start">
              <Link href={`/play/${DEFAULT_SCENARIO}`} data-cursor="enter">
                Answer the call
              </Link>
            </Button>
            <p className="max-w-[36ch] text-sm leading-relaxed text-smoke">
              Talk out loud. Your voice streams to the caller for that call only and is never stored.
            </p>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
