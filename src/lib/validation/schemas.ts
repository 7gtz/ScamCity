import { z } from "zod";

/**
 * Every server boundary is validated here (ScamCity-stack.md). The same Zod
 * schemas generate the JSON Schema that constrains Gemini's structured output,
 * so model responses and API contracts cannot drift apart.
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

export const TokenRequestSchema = z.object({
  scenarioId: z.string().max(64),
  context: RealWorldContextSchema.optional(),
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
});

/** The analyst's per-turn read of the call. */
export const AnalysisSchema = z.object({
  suspicion: z.number().min(0).max(1).describe("How guarded the player is acting now: 0 trusting/compliant, 1 openly challenging or refusing."),
  scammerTactics: z.array(Tactic).max(6).describe("Tactics used in the caller's latest turn only."),
  playerDetected: z.array(Tactic).max(6).describe("Tactics the player has explicitly recognised or resisted so far."),
  revealed: z
    .array(z.string().max(40))
    .max(6)
    .describe('Kinds of sensitive detail the player gave away, e.g. "One-time passcode". Never the values themselves.'),
  intent: z.string().max(80).describe("At most 10 words: what the caller is attempting right now."),
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
  revealed: z.array(z.string().max(40)).max(12),
  tacticsDetected: z.array(z.object({ tactic: Tactic, at: z.number().nonnegative() })).max(12),
  suspicion: z.array(z.object({ at: z.number().nonnegative(), value: z.number().min(0).max(1) })).max(400),
  decisionQuality: z.number().optional(),
  context: RealWorldContextSchema.optional(),
});

/** What the judge model must return. */
export const JudgeSchema = z.object({
  score: z.number().int().min(0).max(100),
  caught: z
    .array(z.object({ tactic: Tactic, atSeconds: z.number().min(0) }))
    .max(6)
    .describe("Tactics the player recognised, with the second they first did."),
  missed: z.array(Tactic).max(6).describe("Tactics the caller used that the player never challenged."),
  events: z
    .array(z.object({ atSeconds: z.number().min(0), label: z.string().max(24) }))
    .max(6)
    .describe("3–5 key moments, each labelled in one or two lowercase words."),
  notes: z.array(z.string().max(240)).min(1).max(4).describe("2–4 specific second-person sentences quoting the call."),
});
export type JudgeOutput = z.infer<typeof JudgeSchema>;

export const RiddleRequestSchema = z.object({
  weak: z.array(Tactic).max(3),
  avoid: z.array(z.string().max(300)).max(12),
  wantLegit: z.boolean(),
  context: RealWorldContextSchema.optional(),
});

export const GeneratedRiddleSchema = z.object({
  channel: z.enum(["SMS", "Call", "Email"]),
  time: z.string().max(12).describe('Local clock time, e.g. "09:42 AM".'),
  from: z.string().max(80),
  subject: z.string().max(80).optional(),
  body: z.string().max(360),
  scam: z.boolean(),
  category: z.enum(["phishing", "impersonation", "delivery", "tech-support", "other"]).optional(),
  tell: z.string().max(60).describe("The giveaway: an exact 2–6 word substring of body."),
  explanation: z.string().max(320),
  targets: z.array(Tactic).max(3),
});
