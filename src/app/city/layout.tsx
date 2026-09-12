import type { ReactNode } from "react";
import { GameProvider } from "@/game/integration/GameProvider";

export default function CityLayout({ children }: { children: ReactNode }) {
  return <GameProvider>{children}</GameProvider>;
}
