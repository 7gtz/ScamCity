"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import type { PanelDefinition } from "@/game/world/types";
import { evaluateCondition, enterPanel } from "./game";
import { useGameState } from "./use-game-state";
import { useGameReady } from "./GameProvider";
import { panels, panelHref } from "./panel-registry";

/** Replace these bootstrap screens with the world owner's map/panel components. */
export function CityMapScreen() {
  const ready = useGameReady();
  const state = useGameState((value) => value);
  if (!ready) return <p role="status">Restoring investigation…</p>;
  return (
    <section aria-labelledby="city-title" className="mx-auto max-w-5xl px-6 py-24 text-bone">
      <p className="font-mono text-sm uppercase tracking-widest text-amber">SCAM CITY / Detective track</p>
      <h1 id="city-title" className="my-6 font-display text-5xl">The Ten-Minute Window</h1>
      <p className="mb-8 text-smoke">Choose a location. Your investigation is saved on this device.</p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {panels.map((panel) => {
          const open = !panel.requires || evaluateCondition(panel.requires, state);
          return <li key={panel.id} className="border border-line p-6">
            {open ? <Link href={panelHref(panel.id)} className="text-xl underline underline-offset-4">{panel.title}</Link> : <span>{panel.title} — Locked</span>}
            {state.location === panel.id && <p className="mt-2 text-sm text-amber">Current location</p>}
          </li>;
        })}
      </ul>
    </section>
  );
}

/** Children/overlay slots let dialogue, evidence and live calls remain independent. */
export function CityPanelScreen({ panel, children, overlay }: { panel: PanelDefinition; children?: ReactNode; overlay?: ReactNode }) {
  const ready = useGameReady();
  const state = useGameState((value) => value);
  const open = !panel.requires || evaluateCondition(panel.requires, state);
  useEffect(() => { if (ready && open) enterPanel(panel.id); }, [ready, open, panel.id]);
  if (!ready) return <p role="status">Restoring investigation…</p>;
  if (!open) return <section className="px-6 py-24"><h1>Location locked</h1><Link href="/city">Return to map</Link></section>;
  return <section aria-labelledby="panel-title" data-tone={panel.tone} className="min-h-dvh px-6 py-24 text-bone">
    <Link href="/city" className="font-mono text-sm text-amber underline">City map</Link>
    <h1 id="panel-title" className="my-8 font-display text-5xl">{panel.title}</h1>
    {children ?? <p className="text-smoke">The investigation at this location is not available yet.</p>}
    {overlay}
  </section>;
}
