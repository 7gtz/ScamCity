import type { DistrictId } from "@/lib/live/types";

export type ArtifactKind = "ledger" | "tracking" | "log" | "notice" | "chat";

/** A fragment of the interface the scam arrives through (bank app, courier tracking…). */
export interface DistrictArtifact {
  app: string;
  time: string;
  kind: ArtifactKind;
  lines: { text: string; value?: string; flag?: boolean }[];
}

export interface District {
  id: DistrictId;
  number: string;
  title: string;
  /** Progression-list name (brief §18). */
  level: string;
  line: string;
  scenarioId?: string;
  image?: string;
  /**
   * The district's street lighting: a muted secondary colour (decor only —
   * ribbons, halftone, map swatches). Never text; never a game state.
   */
  hue: string;
  /** A lighter cut of `hue` for labels and halftone light on dark grounds (≥ 6.6:1 on ember). */
  hueText: string;
  /** Caller ID shown while the phone rings. */
  callerId: string;
  /** The brand the caller hides behind, and the department they claim. */
  org: string;
  department: string;
  /** What the call is "about", before a word is said. */
  alert: string;
  artifact: DistrictArtifact;
  /** Transit-map position (viewBox 800×500) and which side the label sits. */
  map: { x: number; y: number; label: "above" | "below" | "left" };
}

/** The six districts of SCAM CITY (brief §10), in route order. */
export const DISTRICTS: District[] = [
  {
    id: "bank",
    number: "01",
    title: "The Bank",
    level: "Bank security",
    line: "A calm voice from account security. Something is wrong with your money.",
    scenarioId: "bank-security",
    hue: "#4f7185",
    hueText: "#7fa3b8",
    callerId: "+44 20 7946 0471",
    org: "Northstar Bank",
    department: "Account Security",
    alert: "Suspicious transaction detected on your card.",
    artifact: {
      app: "Northstar · Card activity",
      time: "13:52",
      kind: "ledger",
      lines: [
        { text: "Coffee Lab", value: "£3.40" },
        { text: "Electronics store, Leeds", value: "£1,240.00", flag: true },
        { text: "Status", value: "Pending review", flag: true },
      ],
    },
    map: { x: 130, y: 120, label: "above" },
  },
  {
    id: "delivery",
    number: "02",
    title: "The Delivery",
    level: "Delivery",
    line: "A parcel you weren't expecting. A small fee you didn't owe.",
    scenarioId: "parcel-hold",
    hue: "#b4774d",
    hueText: "#d39a70",
    callerId: "+44 7700 900418",
    org: "SwiftParcel",
    department: "Delivery Support",
    alert: "A package is awaiting payment before redelivery.",
    artifact: {
      app: "SwiftParcel · Tracking",
      time: "09:42",
      kind: "tracking",
      lines: [
        { text: "Dispatched from hub" },
        { text: "Arrived at local depot" },
        { text: "Delivery failed · label damaged", flag: true },
        { text: "Redelivery fee due · £1.99", flag: true },
      ],
    },
    map: { x: 230, y: 380, label: "below" },
  },
  {
    id: "desk",
    number: "03",
    title: "The Desk",
    level: "Tech support",
    line: "Your computer is infected. They can fix it — if you let them in.",
    scenarioId: "desk-support",
    hue: "#66758f",
    hueText: "#93a2bd",
    callerId: "Withheld",
    org: "Nimbus OS",
    department: "Security Desk",
    alert: "Critical security alert: your device is reporting errors.",
    artifact: {
      app: "Event Viewer · System",
      time: "11:03",
      kind: "log",
      lines: [
        { text: "Warning  EVT-4625  logon" },
        { text: "Warning  EVT-7031  service" },
        { text: "Warning  EVT-4625  logon" },
        { text: "1,284 events since 08:00", flag: true },
      ],
    },
    map: { x: 430, y: 380, label: "below" },
  },
  {
    id: "prize",
    number: "04",
    title: "The Prize",
    level: "Prize & reward",
    line: "You've won. There is only one small step before it's yours.",
    scenarioId: "prize-claim",
    hue: "#a88a4a",
    hueText: "#c9a862",
    callerId: "+44 7911 123456",
    org: "Lumen Rewards",
    department: "Winners Team",
    alert: "Your number was drawn. The prize must be claimed today.",
    artifact: {
      app: "Lumen Rewards",
      time: "18:20",
      kind: "notice",
      lines: [
        { text: "You've been selected" },
        { text: "A new phone and £500 in vouchers" },
        { text: "Claim within 24 hours", flag: true },
      ],
    },
    map: { x: 560, y: 250, label: "left" },
  },
  {
    id: "impostor",
    number: "05",
    title: "The Impostor",
    level: "Executive impersonation",
    line: "Your manager needs a favour. Quietly, and before the end of the day.",
    scenarioId: "ceo-favour",
    hue: "#70677e",
    hueText: "#a397b3",
    callerId: "+44 7700 900123",
    org: "Harrow & Finch",
    department: "Managing Director",
    alert: "Personal phone. An urgent, sensitive favour.",
    artifact: {
      app: "Messages · Dana Whitfield",
      time: "16:51",
      kind: "chat",
      lines: [{ text: "Are you at your desk?" }, { text: "Need a quick favour before 5." }, { text: "Keep this between us for now.", flag: true }],
    },
    map: { x: 560, y: 100, label: "above" },
  },
  {
    id: "romance",
    number: "06",
    title: "The Romance",
    level: "Romance",
    line: "Months of warmth. Then one emergency only you can solve.",
    scenarioId: "romance-emergency",
    hue: "#9a5d68",
    hueText: "#c98a95",
    callerId: "+971 50 ••• 2188",
    org: "Alex · Kindred",
    department: "Calling from offshore",
    alert: "Poor signal. Someone you've only met online.",
    artifact: {
      app: "Kindred · Alex",
      time: "23:08",
      kind: "chat",
      lines: [
        { text: "Finally got a signal out here" },
        { text: "You're the only thing keeping me going" },
        { text: "I need a favour. Only you can help.", flag: true },
      ],
    },
    map: { x: 690, y: 300, label: "below" },
  },
];

/**
 * The legitimate control call: a bonus off the route, not a seventh district.
 * It lives in the Bank district (same caller ID space, different intent).
 */
export const BONUS = {
  scenarioId: "card-alert",
  title: "The legitimate call",
  callerId: "+44 345 600 0471",
  alert: "A card payment has been paused for your approval.",
  map: { x: 300, y: 120, label: "below" as const },
};
