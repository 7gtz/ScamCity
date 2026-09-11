/** The landing narrative (MASTER §7). Order is the scroll order. */
export const SECTIONS = [
  { id: "opening", label: "Opening" },
  { id: "incoming", label: "Incoming call" },
  { id: "city", label: "The city" },
  { id: "threat", label: "The threat" },
  { id: "opponent", label: "The opponent" },
  { id: "live", label: "Live call" },
  { id: "judge", label: "The judge" },
  { id: "riddle", label: "Riddle mode" },
  { id: "progression", label: "Your city" },
  { id: "impact", label: "Impact" },
  { id: "enter", label: "Enter" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

export const sectionNumber = (id: SectionId) =>
  String(SECTIONS.findIndex((s) => s.id === id) + 1).padStart(2, "0");

export const SECTION_TOTAL = String(SECTIONS.length).padStart(2, "0");

export const NAV_LINKS: { label: string; target: SectionId }[] = [
  { label: "About", target: "threat" },
  { label: "Simulation", target: "live" },
  { label: "Training", target: "riddle" },
];
