import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CityPanelScreen } from "@/game/integration/CityScreens";
import { getPanel, panels } from "@/game/integration/panel-registry";

type Props = { params: Promise<{ locationId: string }> };

export function generateStaticParams() { return panels.map(({ id }) => ({ locationId: id })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const panel = getPanel((await params).locationId);
  return { title: panel ? `${panel.title} — SCAM CITY` : "SCAM CITY" };
}

export default async function CityPanelPage({ params }: Props) {
  const panel = getPanel((await params).locationId);
  if (!panel) notFound();
  return <CityPanelScreen panel={panel} />;
}
