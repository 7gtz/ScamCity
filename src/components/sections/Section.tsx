import { SECTIONS, sectionNumber, type SectionId } from "@/content/sections";
import { cn } from "@/lib/cn";
import type { Tone } from "@/lib/tone";

type Props = {
  id: SectionId;
  className?: string;
  children: React.ReactNode;
  /** Remaps the palette for this section (see the tone scopes in globals.css). */
  tone?: Tone;
};

/** A narrative section: anchor, counter hook (data-section), tone, landmark label. */
export function Section({ id, className, children, tone = "dark" }: Props) {
  return (
    <section
      id={id}
      data-section={sectionNumber(id)}
      data-tone={tone}
      aria-labelledby={`${id}-title`}
      className={cn("relative", tone !== "dark" && `tone-${tone} bg-ink text-bone`, className)}
    >
      {children}
    </section>
  );
}

/** `03 · The city` — the evidence-tag above each section. */
export function SectionMeta({ id, className }: { id: SectionId; className?: string }) {
  const label = SECTIONS.find((s) => s.id === id)?.label;
  return (
    <p className={cn("meta text-smoke", className)}>
      {sectionNumber(id)} · {label}
    </p>
  );
}
