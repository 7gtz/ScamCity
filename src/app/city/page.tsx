import type { Metadata } from "next";
import { CityMapScreen } from "@/game/integration/CityScreens";

export const metadata: Metadata = { title: "Detective Track — SCAM CITY" };

export default function CityPage() { return <CityMapScreen />; }
