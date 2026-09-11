import type { Metadata } from "next";
import { ResultsView } from "@/features/scoring/ResultsView";

export const metadata: Metadata = { title: "Call report — SCAM CITY" };

type Props = { params: Promise<{ sessionId: string }> };

export default async function ResultsPage({ params }: Props) {
  const { sessionId } = await params;
  return <ResultsView sessionId={sessionId} />;
}
