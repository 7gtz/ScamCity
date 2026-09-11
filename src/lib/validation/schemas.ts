import { z } from "zod";

/**
 * Every server boundary is validated here (ScamCity-stack.md). The same Zod
 * schemas generate the JSON Schema that constrains Gemini's structured output,
 * so model responses and API contracts cannot drift apart.
 *
 * Caps on model-written strings are deliberately generous: models do not
 * reliably honour maxLength, and a verdict rejected over a long sentence is
 * worse than one trimmed for display. Trimming happens where text is shown.
 */

export const TACTIC_IDS = ["authority", "urgency", "verification-request", "social-pressure", "fear", "secrecy"] as const;
export const Tactic = z.enum(TACTIC_IDS);

export const OUTCOME_IDS = ["hung-up", "scammed", "exposed", "verified-legit", "rejected-legit"] as const;

export const RealWorldContextSchema = z.object({
  timezone: z.string().max(64),
  localTime: z.string().max(64),
  locale: z.string().max(24).optional(),
  city: z.string().max(80).optional(),
  region: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  weather: z.string().max(80).optional(),
  source: z.enum(["gps", "timezone"]),
});

/** What the director knows about the player: it aims each new call at them. */
export const PlayerProfileSchema = z.object({
  weak: z.array(Tactic).max(3),
  cleared: z.number().int().min(0).max(50),
  recentHooks: z.array(z.string().max(400)).max(6),
});
export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;

export const CallBriefSchema = z.object({
  caller: z.string().max(400),
  hook: z.string().max(400),
  objective: z.string().max(600),
});

export const TokenRequestSchema = z.object({
  scenarioId: z.string().max(64),
  context: RealWorldContextSchema.optional(),
  profile: PlayerProfileSchema.optional(),
});

const Turn = z.object({
  speaker: z.enum(["player", "scammer"]),
  text: z.string().max(2000),
  at: z.number().nonnegative(),
});

export const AnalyzeRequestSchema = z.object({
  scenarioId: z.string().max(64),
  transcript: z.array(Turn).max(40),
  detected: z.array(Tactic).max(6),
  /** Per-call truth: the director may have made this call secretly genuine. */
  legitimate: z.boolean().optional(),
  objective: z.string().max(600).optional(),
});

/** The analyst's per-turn read of the call. */
export const AnalysisSchema = z.object({
  suspicion: z.number().min(0).max(1).describe("How guarded the player is acting now: 0 trusting/compliant, 1 openly challenging or refusing."),
  scammerTactics: z.array(Tactic).max(12).describe("Tactics used in the caller's latest turn only."),
  playerDetected: z.array(Tactic).max(12).describe("Tactics the player has explicitly recognised or resisted so far."),
  revealed: z
    .array(z.string().max(160))
    .max(12)
    .describe('Kinds of sensitive detail the player gave away, e.g. "One-time passcode". Never the values themselves.'),
  intent: z.string().max(400).describe("At most 10 words: what the caller is attempting right now."),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

export const CompletedCallSchema = z.object({
  sessionId: z.string().max(64),
  scenarioId: z.string().max(64),
  legitimate: z.boolean(),
  durationMs: z.number().nonnegative(),
  transcript: z
    .array(Turn.extend({ id: z.string().max(32), tactics: z.array(Tactic).optional() }))
    .max(200),
  outcome: z.enum(OUTCOME_IDS),
  revealed: z.array(z.string().max(160)).max(12),
  tacticsDetected: z.array(z.object({ tactic: Tactic, at: z.number().nonnegative() })).max(12),
  suspicion: z.array(z.object({ at: z.number().nonnegative(), value: z.number().min(0).max(1) })).max(400),
  decisionQuality: z.number().optional(),
  context: RealWorldContextSchema.optional(),
  brief: CallBriefSchema.optional(),
});

/** What the judge model must return. */
export const JudgeSchema = z.object({
  score: z.number().min(0).max(100).describe("Whole number, 0–100."),
  caught: z
    .array(z.object({ tactic: Tactic, atSeconds: z.number().min(0) }))
    .max(12)
    .describe("Tactics the player recognised, with the second they first did."),
  missed: z.array(Tactic).max(12).describe("Tactics the caller used that the player never challenged."),
  events: z
    .array(z.object({ atSeconds: z.number().min(0), label: z.string().max(120) }))
    .max(10)
    .describe("3–5 key moments, each labelled in one or two lowercase words."),
  notes: z.array(z.string().max(800)).min(1).max(6).describe("2–4 specific second-person sentences quoting the call."),
});
export type JudgeOutput = z.infer<typeof JudgeSchema>;

export const RiddleRequestSchema = z.object({
  weak: z.array(Tactic).max(3),
  avoid: z.array(z.string().max(900)).max(12),
  wantLegit: z.boolean(),
  context: RealWorldContextSchema.optional(),
});

export const GeneratedRiddleSchema = z.object({
  channel: z.enum(["SMS", "Call", "Email"]),
  time: z.string().max(40).describe('Local clock time, e.g. "09:42 AM".'),
  from: z.string().max(160),
  subject: z.string().max(200).optional(),
  body: z.string().max(900).describe("At most 60 words."),
  scam: z.boolean(),
  category: z.enum(["phishing", "impersonation", "delivery", "tech-support", "other"]).optional(),
  tell: z.string().max(200).describe("The giveaway: an exact 2–6 word substring of body."),
  explanation: z.string().max(900).describe("One or two sentences."),
  targets: z.array(Tactic).max(6),
});

/** The director's plan for one unique call. The live persona improvises inside it. */
export const CallPlanSchema = z.object({
  callerName: z.string().max(120).describe("A realistic full name. Vary cultures and genders between calls."),
  callerRole: z.string().max(120),
  organization: z.string().max(120).describe("A plausible but FICTIONAL organisation — never a real brand."),
  voice: z.enum(["male", "female"]),
  hook: z.string().max(400).describe("One sentence: the specific pretext that opens this call."),
  objective: z.string().max(600).describe("What the caller is trying to get from the player."),
  facts: z.array(z.string().max(400)).min(2).max(8).describe("2–5 specific fictional details the caller can use."),
  tacticPlan: z.array(Tactic).min(1).max(6).describe("The order the caller reaches for tactics."),
  tells: z
    .array(z.string().max(400))
    .max(5)
    .describe("Scam: small mistakes left for a careful player. Genuine: the verification routes the caller offers."),
});
export type CallPlan = z.infer<typeof CallPlanSchema>;
