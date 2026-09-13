import type { NpcId } from "./types";
import { npcPortraitArt } from "./art";
import Image from "next/image";

const PEOPLE: Record<NpcId, { name: string; role: string; initials: string }> = {
  miller: { name: "Detective Miller", role: "Senior Investigator", initials: "DM" },
  mara: { name: "Mara Okoye", role: "Victim", initials: "MO" },
  "mara-call": { name: "Mara Okoye", role: "Incoming call", initials: "MO" },
  vance: { name: "Teller Vance", role: "Branch Compliance", initials: "TV" },
  ravi: { name: "Ravi Sunder", role: "Repair Technician", initials: "RS" },
  brennan: { name: "Sgt. Brennan", role: "Police Desk Sergeant", initials: "SB" },
};

export function npcIdentity(npc: NpcId) {
  return PEOPLE[npc];
}

export function NpcPortrait({ npc }: { npc: NpcId }) {
  const person = PEOPLE[npc];
  return (
    <div className="npc-portrait" data-npc={npc}>
      <Image
        src={npcPortraitArt(npc)}
        alt=""
        fill
        sizes="4.5rem"
        priority
      />
      <span className="sr-only">{person.name}</span>
    </div>
  );
}
