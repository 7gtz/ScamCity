import type { DistrictId } from "@/lib/live/types";

export interface District {
  id: DistrictId;
  number: string;
  title: string;
  /** Progression-list name (brief §18). */
  level: string;
  line: string;
  scenarioId?: string;
  image?: string;
}

/** The six districts of SCAM CITY (brief §10). */
export const DISTRICTS: District[] = [
  {
    id: "bank",
    number: "01",
    title: "The Bank",
    level: "Bank security",
    line: "A calm voice from account security. Something is wrong with your money.",
    scenarioId: "bank-security",
  },
  {
    id: "delivery",
    number: "02",
    title: "The Delivery",
    level: "Delivery",
    line: "A parcel you weren't expecting. A small fee you didn't owe.",
    scenarioId: "parcel-hold",
  },
  {
    id: "desk",
    number: "03",
    title: "The Desk",
    level: "Tech support",
    line: "Your computer is infected. They can fix it — if you let them in.",
    scenarioId: "desk-support",
  },
  {
    id: "prize",
    number: "04",
    title: "The Prize",
    level: "Prize & reward",
    line: "You've won. There is only one small step before it's yours.",
    scenarioId: "prize-claim",
  },
  {
    id: "impostor",
    number: "05",
    title: "The Impostor",
    level: "Executive impersonation",
    line: "Your manager needs a favour. Quietly, and before the end of the day.",
    scenarioId: "ceo-favour",
  },
  {
    id: "romance",
    number: "06",
    title: "The Romance",
    level: "Romance",
    line: "Months of warmth. Then one emergency only you can solve.",
    scenarioId: "romance-emergency",
  },
];
