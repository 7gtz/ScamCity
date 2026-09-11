import { SECTIONS, sectionNumber, type SectionId } from "@/content/sections";
import { cn } from "@/lib/cn";

type Props = {
  id: SectionId;
  className?: string;
  children: React.ReactNode;
};

/** A narrative section: anchor, counter hook (data-section) and landmark label. */
export function Section({ id, className, children }: Props) {
  return (
    <section id={id} data-section={sectionNumber(id)} aria-labelledby={`${id}-title`} className={cn("relative", className)}>
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
