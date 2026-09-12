import { Modality, type LiveConnectConfig } from "@google/genai";
import { renderDossier } from "@/game/npc/context-builder";
import { NPC_PERSONAS, composeInstruction } from "@/game/npc/personas";
import { NPC_TOOL_DECLARATIONS, NpcTokenRequestSchema } from "@/game/npc/schemas";
import type { NpcId } from "@/game/npc/types";
import { MODELS } from "@/lib/gemini/models";
import { gemini, hasGemini } from "@/lib/gemini/server";
import { rateLimit, tooMany } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Opens one conversation with one detective-track NPC.
 *
 * The persona, its pinned voice, its tool subset and the dossier of what it is
 * allowed to know are all locked into a one-use ephemeral token, exactly as
 * `/api/live/token` does for the scam caller. The browser can open this
 * conversation and nothing else, and GEMINI_API_KEY never leaves the server.
 *
 * Note the tool subset: an NPC is only ever given the functions its character
 * could plausibly perform. `executeNpcTool` enforces the same table again on
 * the client, so a model that hallucinates a call it was never given still
 * cannot move the case.
 */
export async function POST(req: Request) {
  if (!hasGemini()) return Response.json({ error: "Live AI is not configured on this server." }, { status: 503 });
  if (!rateLimit(req, "npc-token", 20)) return tooMany();

  const parsed = NpcTokenRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });

  const { context } = parsed.data;
  const npc = parsed.data.npc as NpcId;
  const persona = NPC_PERSONAS[npc];
  if (!persona) return Response.json({ error: "Unknown character." }, { status: 404 });

  const config: LiveConnectConfig = {
    responseModalities: [Modality.AUDIO],
    systemInstruction: composeInstruction(persona, renderDossier(parsed.data.dossier), context),
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: persona.voiceName } } },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    tools: [{ functionDeclarations: persona.tools.map((name) => NPC_TOOL_DECLARATIONS[name]!) }],
  };

  try {
    const now = Date.now();
    const token = await gemini().authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(now + 15 * 60_000).toISOString(),
        newSessionExpireTime: new Date(now + 60_000).toISOString(),
        // Constraints alone lock the whole config into the token. (An empty
        // lockAdditionalFields makes the SDK send a field mask built from these
        // keys, which the Live API rejects: "field_mask is invalid".)
        liveConnectConstraints: { model: MODELS.live, config },
        httpOptions: { apiVersion: "v1alpha" },
      },
    });
    return Response.json(
      {
        token: token.name,
        model: MODELS.live,
        npc,
        name: persona.name,
        role: persona.role,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[detective/npc-token]", err);
    return Response.json({ error: "Could not reach that person." }, { status: 502 });
  }
}
