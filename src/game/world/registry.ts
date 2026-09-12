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

export const panels: readonly PanelDefinition[] = [
  {
    id: "office",
    title: "Detective office",
    tone: "ember",
    hotspots: [
      {
        id: "office-desk",
        rect: { x: 15, y: 55, w: 40, h: 35 },
        label: "Desk — review case intake notes with Detective Miller",
        action: { kind: "talk", npc: "detective" },
      },
      {
        id: "office-door",
        rect: { x: 80, y: 20, w: 15, h: 60 },
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
        rect: { x: 30, y: 22, w: 22, h: 38 },
        label: "Mara Okoye — speak with the victim",
        action: { kind: "talk", npc: "mara-okoye" },
      },
      {
        id: "flat-kitchen-table",
        rect: { x: 8, y: 64, w: 38, h: 26 },
        label: "Kitchen table — papers and a bank statement",
        action: { kind: "inspect", evidence: "bank-statement" },
      },
      {
        id: "flat-landline",
        rect: { x: 50, y: 68, w: 14, h: 18 },
        label: "Landline — check the call log",
        action: { kind: "inspect", evidence: "call-log" },
      },
      {
        id: "flat-mail-slot",
        rect: { x: 4, y: 8, w: 24, h: 32 },
        label: "Mail slot — delivery card on the mat",
        action: { kind: "inspect", evidence: "delivery-notice" },
      },
      {
        id: "flat-sideboard",
        rect: { x: 58, y: 32, w: 24, h: 25 },
        label: "Sideboard — phone with OTP messages",
        action: { kind: "inspect", evidence: "otp-message" },
      },
      {
        id: "flat-front-door",
        rect: { x: 84, y: 10, w: 14, h: 70 },
        label: "Front door — head to the bank",
        action: { kind: "travel", to: "bank-branch" },
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
        rect: { x: 10, y: 45, w: 50, h: 25 },
        label: "Counter — speak with the teller",
        action: { kind: "talk", npc: "teller-vance" },
      },
      {
        id: "bank-teller-window",
        rect: { x: 55, y: 20, w: 25, h: 35 },
        label: "Teller window — ask about the account",
        action: { kind: "talk", npc: "teller-vance" },
      },
      {
        id: "bank-atm-alcove",
        rect: { x: 75, y: 40, w: 20, h: 45 },
        label: "ATM alcove — check the SIM-swap record",
        action: { kind: "inspect", evidence: "sim-swap-record" },
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
        rect: { x: 10, y: 50, w: 35, h: 30 },
        label: "Glass counter — talk to Ravi",
        action: { kind: "talk", npc: "ravi-sunder" },
      },
      {
        id: "shop-workbench",
        rect: { x: 40, y: 45, w: 30, h: 35 },
        label: "Workbench — repair receipt on the bench",
        action: { kind: "inspect", evidence: "repair-receipt" },
      },
      {
        id: "shop-sim-rack",
        rect: { x: 55, y: 10, w: 18, h: 30 },
        label: "SIM rack — SIM card stock and records",
        action: { kind: "inspect", evidence: "sim-swap-record" },
      },
      {
        id: "shop-shutter",
        rect: { x: 75, y: 10, w: 20, h: 70 },
        label: "Shutter — head to the police station",
        action: { kind: "travel", to: "police-station" },
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
        rect: { x: 15, y: 40, w: 45, h: 35 },
        label: "Front desk — speak with Sgt Brennan",
        action: { kind: "talk", npc: "sgt-brennan" },
      },
    ],
  },
] as const;

export const getPanel = (id: string): PanelDefinition | undefined =>
  panels.find((panel) => panel.id === id);

export const panelHref = (id: LocationId) => `/city/${id}` as const;
