/**
 * Authoritative panel definitions with authored hotspots.
 *
 * This is the real registry the captain must wire into CityScreens.tsx,
 * replacing the bootstrap `integration/panel-registry.ts` (which has
 * `hotspots: []` on every panel).
 *
 * Tone note: foundation set repair-shop tone "amber" — ART-REQUIREMENTS §2
 * specifies "ember". This registry follows the spec.
 */

import type { LocationId, PanelDefinition } from "@/game/world/types";
import { validatePanels } from "./validate";

export const panels: readonly PanelDefinition[] = [
  {
    id: "office",
    title: "Detective office",
    tone: "ember",
    hotspots: [
      {
        id: "office-desk",
        rect: { x: 32, y: 42, w: 8, h: 10 },
        label: "Desk — review case intake notes with Detective Miller",
        action: { kind: "talk", npc: "detective" },
      },
      {
        id: "office-door",
        rect: { x: 88, y: 54, w: 8, h: 10 },
        label: "Door — head to the victim's flat",
        action: { kind: "travel", to: "victim-flat" },
      },
    ],
  },
  {
    id: "victim-flat",
    title: "Victim's flat",
    tone: "dark",
    hotspots: [
      {
        id: "flat-mara",
        rect: { x: 43, y: 38, w: 8, h: 10 },
        label: "Mara Okoye — speak with the victim",
        action: { kind: "talk", npc: "mara-okoye" },
      },
      {
        id: "flat-kitchen-table",
        rect: { x: 28, y: 68, w: 8, h: 10 },
        label: "Kitchen table — papers and a bank statement",
        action: { kind: "inspect", evidence: "bank-statement" },
      },
      {
        id: "flat-landline",
        rect: { x: 25, y: 40, w: 8, h: 10 },
        label: "Landline — check the call log",
        action: { kind: "inspect", evidence: "call-log" },
      },
      {
        id: "flat-mail-slot",
        rect: { x: 78, y: 76, w: 8, h: 10 },
        label: "Door mat — delivery card on the mat",
        action: { kind: "inspect", evidence: "delivery-notice" },
      },
      {
        id: "flat-sideboard",
        rect: { x: 66, y: 40, w: 8, h: 10 },
        label: "Sideboard — phone with OTP messages",
        action: { kind: "inspect", evidence: "otp-message" },
      },
      {
        id: "flat-front-door",
        rect: { x: 90, y: 48, w: 8, h: 10 },
        label: "Front door — head to the bank",
        action: { kind: "travel", to: "bank-branch" },
      },
      {
        id: "flat-office-route",
        rect: { x: 4, y: 38, w: 8, h: 10 },
        label: "Stairwell — return to the detective office",
        action: { kind: "travel", to: "office" },
      },
    ],
  },
  {
    id: "bank-branch",
    title: "Bank branch",
    tone: "paper",
    hotspots: [
      {
        id: "bank-counter",
        rect: { x: 37, y: 44, w: 8, h: 10 },
        label: "Counter — speak with the teller",
        action: { kind: "talk", npc: "teller-vance" },
      },
      {
        id: "bank-teller-window",
        rect: { x: 66, y: 59, w: 8, h: 10 },
        label: "Evidence file — present the account details",
        action: { kind: "talk", npc: "teller-vance" },
      },
      {
        id: "bank-atm-alcove",
        rect: { x: 55, y: 64, w: 8, h: 10 },
        label: "Compliance terminal — check the SIM-swap record",
        action: { kind: "inspect", evidence: "sim-swap-record" },
      },
      {
        id: "bank-flat-route",
        rect: { x: 4, y: 76, w: 8, h: 10 },
        label: "Street exit — return to the victim's flat",
        action: { kind: "travel", to: "victim-flat" },
      },
      {
        id: "bank-shop-route",
        rect: { x: 88, y: 36, w: 8, h: 10 },
        label: "Side exit — head to the repair shop",
        action: { kind: "travel", to: "repair-shop" },
      },


    ],
  },
  {
    id: "repair-shop",
    title: "Phone-repair shop",
    tone: "ember",
    hotspots: [
      {
        id: "shop-glass-counter",
        rect: { x: 27, y: 40, w: 8, h: 10 },
        label: "Glass counter — talk to Ravi",
        action: { kind: "talk", npc: "ravi-sunder" },
      },
      {
        id: "shop-workbench",
        rect: { x: 51, y: 48, w: 8, h: 10 },
        label: "Workbench — repair receipt on the bench",
        action: { kind: "inspect", evidence: "repair-receipt" },
      },
      {
        id: "shop-sim-rack",
        rect: { x: 60, y: 40, w: 8, h: 10 },
        label: "SIM rack — SIM card stock and records",
        action: { kind: "inspect", evidence: "sim-swap-record" },
      },
      {
        id: "shop-shutter",
        rect: { x: 81, y: 40, w: 8, h: 10 },
        label: "Shutter — head to the police station",
        action: { kind: "travel", to: "police-station" },
      },
      {
        id: "shop-bank-route",
        rect: { x: 4, y: 39, w: 8, h: 10 },
        label: "Shop entrance — return to the bank",
        action: { kind: "travel", to: "bank-branch" },
      },

    ],
  },
  {
    id: "police-station",
    title: "Police station",
    tone: "dark",
    hotspots: [
      {
        id: "station-front-desk",
        rect: { x: 33.5, y: 40, w: 8, h: 10 },
        label: "Front desk — speak with Sgt Brennan",
        action: { kind: "talk", npc: "sgt-brennan" },
      },
      {
        id: "station-shop-route",
        rect: { x: 4, y: 46, w: 8, h: 10 },
        label: "Station doors — return to the repair shop",
        action: { kind: "travel", to: "repair-shop" },
      },

    ],
  },
] as const;

export const getPanel = (id: string): PanelDefinition | undefined =>
  panels.find((panel) => panel.id === id);

export const panelHref = (id: LocationId) => `/city/${id}` as const;

if (process.env.NODE_ENV === "development") {
  const issues = validatePanels(panels);
  if (issues.length) console.warn("World registry validation:", issues.join("; "));
}
