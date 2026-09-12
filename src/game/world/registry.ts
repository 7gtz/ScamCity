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
        label: "Desk — case notes and files",
        action: { kind: "inspect", evidence: "case-notes" },
      },
      {
        id: "office-window",
        rect: { x: 60, y: 10, w: 30, h: 40 },
        label: "Window — amber light from the street",
        action: { kind: "inspect", evidence: "window-view" },
      },
      {
        id: "office-corkboard",
        rect: { x: 5, y: 10, w: 25, h: 40 },
        label: "Corkboard — pinned leads",
        action: { kind: "inspect", evidence: "case-board" },
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
        id: "flat-kitchen-table",
        rect: { x: 10, y: 50, w: 35, h: 40 },
        label: "Kitchen table — papers and a bank statement",
        action: { kind: "inspect", evidence: "bank-statement" },
      },
      {
        id: "flat-landline",
        rect: { x: 50, y: 55, w: 15, h: 20 },
        label: "Landline — check the call log",
        action: { kind: "inspect", evidence: "call-log" },
      },
      {
        id: "flat-front-door",
        rect: { x: 80, y: 15, w: 15, h: 65 },
        label: "Front door — head to the bank",
        action: { kind: "travel", to: "bank-branch" },
      },
      {
        id: "flat-window",
        rect: { x: 5, y: 10, w: 25, h: 35 },
        label: "Window — view of the street",
        action: { kind: "inspect", evidence: "window-scene" },
      },
      {
        id: "flat-sideboard",
        rect: { x: 55, y: 30, w: 25, h: 25 },
        label: "Sideboard — phone with OTP messages",
        action: { kind: "inspect", evidence: "otp-message" },
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
        id: "bank-queue-barrier",
        rect: { x: 10, y: 75, w: 40, h: 20 },
        label: "Queue area — look around",
        action: { kind: "inspect", evidence: "queue-area" },
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
        id: "shop-parts-wall",
        rect: { x: 5, y: 5, w: 30, h: 40 },
        label: "Parts wall — phone components",
        action: { kind: "inspect", evidence: "parts-inventory" },
      },
      {
        id: "shop-workbench",
        rect: { x: 40, y: 45, w: 30, h: 35 },
        label: "Workbench — repair receipt on the bench",
        action: { kind: "inspect", evidence: "repair-receipt" },
      },
      {
        id: "shop-shutter",
        rect: { x: 75, y: 10, w: 20, h: 70 },
        label: "Shutter — head to the police station",
        action: { kind: "travel", to: "police-station" },
      },
      {
        id: "shop-sim-rack",
        rect: { x: 55, y: 10, w: 18, h: 30 },
        label: "SIM rack — SIM card stock and records",
        action: { kind: "inspect", evidence: "sim-swap-record" },
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
      {
        id: "station-notice-board",
        rect: { x: 5, y: 5, w: 30, h: 30 },
        label: "Notice board — public safety warnings",
        action: { kind: "inspect", evidence: "case-notices" },
      },
      {
        id: "station-corridor-door",
        rect: { x: 70, y: 15, w: 20, h: 55 },
        label: "Corridor door — restricted area",
        action: { kind: "inspect", evidence: "corridor-access" },
      },
    ],
  },
] as const;

export const getPanel = (id: string): PanelDefinition | undefined =>
  panels.find((panel) => panel.id === id);

export const panelHref = (id: LocationId) => `/city/${id}` as const;
