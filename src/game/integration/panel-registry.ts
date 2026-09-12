import type { LocationId, PanelDefinition } from "@/game/world/types";

/** Route bootstrap until world/registry.ts lands; no authored interactions here. */
export const panels: readonly PanelDefinition[] = [
  { id: "office", title: "Detective office", tone: "dark", hotspots: [] },
  { id: "victim-flat", title: "Victim’s flat", tone: "ember", hotspots: [] },
  { id: "bank-branch", title: "Bank branch", tone: "paper", hotspots: [] },
  { id: "repair-shop", title: "Phone-repair shop", tone: "amber", hotspots: [] },
  { id: "police-station", title: "Police station", tone: "dark", hotspots: [] },
];

export const getPanel = (id: string): PanelDefinition | undefined => panels.find((panel) => panel.id === id);
export const panelHref = (id: LocationId) => `/city/${id}` as const;
