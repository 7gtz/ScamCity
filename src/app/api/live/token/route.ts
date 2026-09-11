import { Modality, type LiveConnectConfig } from "@google/genai";
import { getScenario } from "@/content/scenarios";
import { MODELS, VOICES } from "@/lib/gemini/models";
import { buildLiveSystemInstruction, END_CALL } from "@/lib/gemini/persona";
import { gemini, hasGemini } from "@/lib/gemini/server";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { TokenRequestSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/**
 * Mints a one-use ephemeral token with the persona, voice, tools and
 * transcription locked in. The browser can open exactly this call and nothing
 * else; GEMINI_API_KEY never leaves the server.
 */
export async function POST(req: Request) {
  if (!hasGemini()) return Response.json({ error: "Live AI is not configured on this server." }, { status: 503 });
  if (!rateLimit(req, "live-token", 8)) return tooMany();

  const parsed = TokenRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const scenario = getScenario(parsed.data.scenarioId);
  if (!scenario) return Response.json({ error: "Unknown scenario." }, { status: 404 });

  const config: LiveConnectConfig = {
    responseModalities: [Modality.AUDIO],
    systemInstruction: buildLiveSystemInstruction(scenario, parsed.data.context),
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICES[scenario.persona.id] ?? "Charon" } } },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    tools: [{ functionDeclarations: [END_CALL] }],
  };

  try {
    const now = Date.now();
    const token = await gemini().authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(now + 15 * 60_000).toISOString(),
        newSessionExpireTime: new Date(now + 60_000).toISOString(),
        liveConnectConstraints: { model: MODELS.live, config },
        lockAdditionalFields: [],
        httpOptions: { apiVersion: "v1alpha" },
      },
    });
    return Response.json(
      { token: token.name, model: MODELS.live, legitimate: scenario.persona.legitimate },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[live/token]", err);
    return Response.json({ error: "Could not open a line to the caller." }, { status: 502 });
  }
}
