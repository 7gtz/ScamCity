import type { Metadata } from "next";
import { FreestyleConsole } from "@/features/freestyle/FreestyleConsole";

export const metadata: Metadata = { title: "Freestyle — SCAM CITY" };

export default function FreestylePage() {
  return (
    <div className="gutter-x mx-auto max-w-[1600px] pt-[calc(var(--nav-h)+5rem)] pb-32">
      <FreestyleConsole />
    </div>
  );
}
