import type { ReactNode } from "react";
import { GameProvider } from "@/game/integration/GameProvider";
import "./city.css";

export default function CityLayout({ children }: { children: ReactNode }) {
  return <GameProvider>{children}</GameProvider>;
}
