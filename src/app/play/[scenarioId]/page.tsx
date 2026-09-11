import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getScenario, SCENARIOS } from "@/content/scenarios";
import { CallRoom } from "@/features/call/CallRoom";

type Props = { params: Promise<{ scenarioId: string }> };

export function generateStaticParams() {
  return Object.keys(SCENARIOS).map((scenarioId) => ({ scenarioId }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const scenario = getScenario((await params).scenarioId);
  return { title: scenario ? `Level ${scenario.persona.level} — SCAM CITY` : "SCAM CITY" };
}

export default async function PlayPage({ params }: Props) {
  const scenario = getScenario((await params).scenarioId);
  if (!scenario) notFound();
  return <CallRoom scenarioId={scenario.id} persona={scenario.persona} />;
}
