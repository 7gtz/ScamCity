/**
 * Evidence card renderer — follows the DistrictArtifact.tsx pattern exactly
 * for kinds `ledger | tracking | log | notice | chat`, adds `statement`
 * as a sixth kind.
 *
 * Does NOT import or modify DistrictArtifact.tsx. It belongs to the existing
 * game. This is a parallel implementation for the case layer.
 *
 * Design tokens only. `--color-signal` (red) and `--color-safe` (green) carry
 * game state and must never be decorative.
 *
 * Spec: ops/prompts/antigravity-dialogue-case.md §4.5.
 */

"use client";

import type { EvidenceItem } from "@/game/case/types";

const Flag = () => (
  <span aria-hidden className="inline-block size-1.5 shrink-0 rounded-full bg-amber" />
);

function StatementBody({ lines }: { lines: EvidenceItem["lines"] }) {
  return (
    <blockquote className="flex flex-col gap-2 border-l-2 border-l-amber pl-4 italic">
      {lines.map((l, i) => (
        <p
          key={`${l.text}-${i}`}
          className={`leading-relaxed ${l.flag ? "flex items-center gap-2 text-bone" : "text-ash"}`}
        >
          {l.flag && <Flag />}
          {l.text}
          {l.value && (
            <span className="ml-2 not-italic text-smoke tabular">{l.value}</span>
          )}
        </p>
      ))}
    </blockquote>
  );
}

function LedgerBody({ lines }: { lines: EvidenceItem["lines"] }) {
  return (
    <dl>
      {lines.map((l) => (
        <div
          key={l.text}
          className="flex items-baseline justify-between gap-4 border-t border-line py-2"
        >
          <dt className="text-ash">{l.text}</dt>
          <dd
            className={`flex items-center gap-2 tabular ${l.flag ? "text-bone" : "text-ash"}`}
          >
            {l.flag && <Flag />}
            {l.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function TrackingBody({ lines }: { lines: EvidenceItem["lines"] }) {
  return (
    <ol className="relative flex flex-col gap-2.5 pl-5">
      <span
        aria-hidden
        className="absolute top-1.5 bottom-1.5 left-[3px] w-px bg-line"
      />
      {lines.map((l) => (
        <li
          key={l.text}
          className={`relative ${l.flag ? "text-bone" : "text-ash"}`}
        >
          <span
            aria-hidden
            className={`absolute top-[0.45em] -left-5 size-[7px] rounded-full ${l.flag ? "bg-amber" : "bg-dim"}`}
          />
          {l.text}
          {l.value && (
            <span className="ml-2 text-smoke tabular">{l.value}</span>
          )}
        </li>
      ))}
    </ol>
  );
}

function LogBody({ lines }: { lines: EvidenceItem["lines"] }) {
  return (
    <ol className="flex flex-col gap-1 font-mono text-xs">
      {lines.map((l, i) => (
        <li
          key={`${l.text}-${i}`}
          className={`flex items-center gap-2 ${l.flag ? "text-bone" : "text-smoke"}`}
        >
          {l.flag && <Flag />}
          {l.text}
          {l.value && (
            <span className="ml-2 tabular">{l.value}</span>
          )}
        </li>
      ))}
    </ol>
  );
}

function NoticeBody({ lines }: { lines: EvidenceItem["lines"] }) {
  return (
    <div className="flex flex-col gap-1">
      {lines.map((l, i) => (
        <p
          key={l.text}
          className={
            i === 0
              ? "font-semibold text-bone"
              : l.flag
                ? "mt-1 flex items-center gap-2 text-bone"
                : "text-ash"
          }
        >
          {l.flag && <Flag />}
          {l.text}
          {l.value && (
            <span className="ml-2 text-smoke tabular">{l.value}</span>
          )}
        </p>
      ))}
    </div>
  );
}

function ChatBody({ lines }: { lines: EvidenceItem["lines"] }) {
  return (
    <ol className="flex flex-col gap-1.5">
      {lines.map((l) => (
        <li
          key={l.text}
          className={`max-w-[92%] self-start bg-raised px-3 py-2 leading-snug ${l.flag ? "flex items-center gap-2 text-bone" : "text-ash"}`}
        >
          {l.flag && <Flag />}
          {l.text}
          {l.value && (
            <span className="ml-2 text-smoke tabular">{l.value}</span>
          )}
        </li>
      ))}
    </ol>
  );
}

function EvidenceBody({ item }: { item: EvidenceItem }) {
  const { kind, lines } = item;
  if (kind === "ledger") return <LedgerBody lines={lines} />;
  if (kind === "tracking") return <TrackingBody lines={lines} />;
  if (kind === "log") return <LogBody lines={lines} />;
  if (kind === "notice") return <NoticeBody lines={lines} />;
  if (kind === "statement") return <StatementBody lines={lines} />;
  return <ChatBody lines={lines} />;
}

export interface EvidenceCardProps {
  item: EvidenceItem;
  className?: string;
  /** Whether the card is expanded to show full content. */
  expanded?: boolean;
  /** Callback when the card is clicked/activated. */
  onActivate?: () => void;
}

/**
 * Renders an evidence item following the DistrictArtifact pattern.
 *
 * Uses design tokens only. `--color-signal` and `--color-safe` carry game
 * state and are never decorative.
 */
export function EvidenceCard({
  item,
  className = "",
  expanded = true,
  onActivate,
}: EvidenceCardProps) {
  return (
    <figure
      aria-label={`Evidence: ${item.title}`}
      role={onActivate ? "button" : undefined}
      tabIndex={onActivate ? 0 : undefined}
      onClick={onActivate}
      onKeyDown={
        onActivate
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onActivate();
              }
            }
          : undefined
      }
      className={`border border-t-2 border-line border-t-amber bg-ink/90 p-4 text-sm ${onActivate ? "cursor-pointer transition-colors hover:bg-raised/80" : ""} ${className}`}
    >
      <figcaption className="mb-3 flex items-baseline justify-between gap-4 text-smoke">
        <span className="font-semibold text-amber">{item.title}</span>
        <span className="shrink-0 text-xs uppercase tracking-wider text-dim">
          {item.kind}
        </span>
      </figcaption>
      {item.falseLead && (
        <p className="mb-2 text-xs text-dim italic">
          ⚠ Unverified lead — requires cross-reference
        </p>
      )}
      {expanded && <EvidenceBody item={item} />}
    </figure>
  );
}
