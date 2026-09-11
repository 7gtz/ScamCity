import { Modality, type LiveConnectConfig } from "@google/genai";
import { getScenario } from "@/content/scenarios";
import { BRIEFS } from "@/lib/gemini/briefs";
import { difficultyFor, planCall } from "@/lib/gemini/director";
import { MODELS, pickVoice } from "@/lib/gemini/models";
import { buildLiveSystemInstruction, END_CALL } from "@/lib/gemini/persona";
import { gemini, hasGemini } from "@/lib/gemini/server";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { TokenRequestSchema, type CallPlan } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/** Share of calls in twist districts that are secretly genuine (false-positive training). */
const LEGIT_TWIST = 0.2;

/**
 * 1. The director writes a unique plan for this call, aimed at this player.
 * 2. The plan, voice, tools and transcription are locked into a one-use
 *    ephemeral token. The browser can open exactly this call and nothing
 *    else; GEMINI_API_KEY never leaves the server.
 */
export async function POST(req: Request) {
  if (!hasGemini()) return Response.json({ error: "Live AI is not configured on this server." }, { status: 503 });
  if (!rateLimit(req, "live-token", 8)) return tooMany();

  const parsed = TokenRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const { scenarioId, context, profile } = parsed.data;
  const scenario = getScenario(scenarioId);
  const brief = BRIEFS[scenarioId];
  if (!scenario || !brief) return Response.json({ error: "Unknown scenario." }, { status: 404 });

  let legitimate = scenario.persona.legitimate || Boolean(scenario.twist && brief.legitGuide && Math.random() < LEGIT_TWIST);
  let plan: CallPlan = brief.plan;
  let planner: "director" | "static" = "static";
  try {
    plan = await planCall({ scenario, legitimate, context, profile });
    planner = "director";
  } catch (err) {
    console.error("[live/token] director failed, using the district's own plan", err);
    // The hand-written plans are scams; only the director can write a genuine twist.
    legitimate = scenario.persona.legitimate;
  }

  const config: LiveConnectConfig = {
    responseModalities: [Modality.AUDIO],
    systemInstruction: buildLiveSystemInstruction(plan, {
      legitimate,
      difficulty: difficultyFor(scenario, profile),
      context,
      weak: profile?.weak,
    }),
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: pickVoice(plan.voice) } } },
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
        legitimate,
        planner,
        caller: { name: plan.callerName, role: plan.callerRole, organization: plan.organization },
        brief: {
          caller: `${plan.callerName}, ${plan.callerRole} · ${plan.organization}`,
          hook: plan.hook,
          objective: plan.objective,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[live/token]", err);
    return Response.json({ error: "Could not open a line to the caller." }, { status: 502 });
  }
}
