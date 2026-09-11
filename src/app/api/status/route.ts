import { MODELS } from "@/lib/gemini/models";
import { hasGemini } from "@/lib/gemini/server";

export const dynamic = "force-dynamic";

/** Tells the client whether live AI is available, so it can pick a provider. */
export function GET() {
  return Response.json({ gemini: hasGemini(), models: MODELS }, { headers: { "Cache-Control": "no-store" } });
}
