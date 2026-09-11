import type { DistrictArtifact as Artifact } from "@/content/districts";
import { cn } from "@/lib/cn";

/**
 * The interface a district's scam arrives through — a bank ledger, a courier
 * tracker, an event log, a notification, a chat. Drawn with the district's
 * light (`--hue-text` from the parent). Flagged lines get an amber marker:
 * uncertain, not yet a verdict.
 */
export function DistrictArtifact({ artifact, className }: { artifact: Artifact; className?: string }) {
  return (
    <figure
      aria-label={`${artifact.app}, ${artifact.time}`}
      className={cn("border border-t-2 border-line border-t-[color:var(--hue-text)] bg-ink/90 p-4 text-sm", className)}
    >
      <figcaption className="meta mb-3 flex justify-between gap-4 text-smoke">
        <span className="text-[color:var(--hue-text)]">{artifact.app}</span>
        <span className="tabular">{artifact.time}</span>
      </figcaption>
      <Body artifact={artifact} />
    </figure>
  );
}

const Flag = () => <span aria-hidden className="inline-block size-1.5 shrink-0 rounded-full bg-amber" />;

function Body({ artifact }: { artifact: Artifact }) {
  const { kind, lines } = artifact;

  if (kind === "ledger")
    return (
      <dl>
        {lines.map((l) => (
          <div key={l.text} className="flex items-baseline justify-between gap-4 border-t border-line py-2">
            <dt className="text-ash">{l.text}</dt>
            <dd className={cn("flex items-center gap-2 tabular", l.flag ? "text-bone" : "text-ash")}>
              {l.flag && <Flag />}
              {l.value}
            </dd>
          </div>
        ))}
      </dl>
    );

  if (kind === "tracking")
    return (
      <ol className="relative flex flex-col gap-2.5 pl-5">
        <span aria-hidden className="absolute top-1.5 bottom-1.5 left-[3px] w-px bg-line" />
        {lines.map((l) => (
          <li key={l.text} className={cn("relative", l.flag ? "text-bone" : "text-ash")}>
            <span
              aria-hidden
              className={cn("absolute top-[0.45em] -left-5 size-[7px] rounded-full", l.flag ? "bg-amber" : "bg-dim")}
            />
            {l.text}
          </li>
        ))}
      </ol>
    );

  if (kind === "log")
    return (
      <ol className="flex flex-col gap-1 font-mono text-xs">
        {lines.map((l, i) => (
          <li key={`${l.text}-${i}`} className={cn("flex items-center gap-2", l.flag ? "text-bone" : "text-smoke")}>
            {l.flag && <Flag />}
            {l.text}
          </li>
        ))}
      </ol>
    );

  if (kind === "notice")
    return (
      <div className="flex flex-col gap-1">
        {lines.map((l, i) => (
          <p
            key={l.text}
            className={cn(
              i === 0 ? "font-semibold text-bone" : l.flag ? "mt-1 flex items-center gap-2 text-bone" : "text-ash",
            )}
          >
            {l.flag && <Flag />}
            {l.text}
          </p>
        ))}
      </div>
    );

  return (
    <ol className="flex flex-col gap-1.5">
      {lines.map((l) => (
        <li
          key={l.text}
          className={cn(
            "max-w-[92%] self-start bg-raised px-3 py-2 leading-snug",
            l.flag ? "flex items-center gap-2 text-bone" : "text-ash",
          )}
        >
          {l.flag && <Flag />}
          {l.text}
        </li>
      ))}
    </ol>
  );
}
