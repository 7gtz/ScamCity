import { renderDossier } from "@/game/npc/context-builder";
import { NPC_PERSONAS, composeInstruction } from "@/game/npc/personas";
import { NPC_TOOL_DECLARATIONS, NpcChatRequestSchema } from "@/game/npc/schemas";
import type { NpcId } from "@/game/npc/types";
import { MODELS } from "@/lib/gemini/models";
import { gemini, hasGemini } from "@/lib/gemini/server";
import { rateLimit, tooMany } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 12_000;

/**
 * Typed conversation with an NPC — the same persona and the same tools as the
 * voice path, over plain REST.
 *
 * This exists for three situations that all matter: a player with no working
 * microphone, a demo machine where audio is a risk, and automated tests that
 * need to drive a whole scene deterministically.
 *
 * The route deliberately does NOT execute tool calls. It returns what the
 * character attempted, and the client runs `executeNpcTool` against live game
 * state, exactly as the voice path does — so both paths are governed by one
 * copy of the rules. When a call comes back refused, the client sends the
 * reason as the next message and the NPC explains itself in character.
 */
export async function POST(req: Request) {
  if (!hasGemini()) return Response.json({ error: "Live AI is not configured on this server." }, { status: 503 });
  if (!rateLimit(req, "npc-chat", 40)) return tooMany();

  const parsed = NpcChatRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });

  const { npc, dossier, turns, message, context } = parsed.data;
  const persona = NPC_PERSONAS[npc as NpcId];
  if (!persona) return Response.json({ error: "Unknown character." }, { status: 404 });

  const contents = [
    ...turns.map((turn) => ({
      role: turn.speaker === "player" ? "user" : "model",
      parts: [{ text: turn.text }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await gemini().models.generateContent({
      model: MODELS.director,
      contents,
      config: {
        systemInstruction: composeInstruction(persona, renderDossier(dossier), context),
        temperature: 0.9,
        tools: [{ functionDeclarations: persona.tools.map((name) => NPC_TOOL_DECLARATIONS[name]!) }],
        abortSignal: controller.signal,
      },
    });

    const calls = (res.functionCalls ?? []).map((call, index) => ({
      id: call.id ?? `chat-${index}`,
      name: call.name ?? "",
      args: call.args ?? {},
    }));

    return Response.json(
      { text: res.text ?? "", calls },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[detective/npc-chat]", err);
    return Response.json({ error: "They did not answer." }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
