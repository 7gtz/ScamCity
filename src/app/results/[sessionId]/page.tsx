import type { Metadata } from "next";
import { ResultsView } from "@/features/scoring/ResultsView";

type Props = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ channel?: string }>;
};

/** The score lives in the browser; the channel rides in the URL so the tab title is right from the first paint. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { channel } = await searchParams;
  return { title: `${channel === "messages" ? "Conversation" : "Call"} report — SCAM CITY` };
}

export default async function ResultsPage({ params }: Props) {
  const { sessionId } = await params;
  return <ResultsView sessionId={sessionId} />;
}
