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
    .describe(
      'Kinds of sensitive detail the player gave away — including confirming a detail the caller read out — e.g. "One-time passcode", "Confirmed account number". Never the values themselves.',
    ),
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

/** What the judge model must return. The score is computed from `breakdown` in code (compose.ts). */
export const JudgeSchema = z.object({
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
  breakdown: z
    .array(
      z.object({
        label: z.string().max(160).describe("At most 8 words naming one specific thing the player did."),
        points: z.number().min(-60).max(60).describe("What it earned (positive) or cost (negative)."),
      }),
    )
    .min(2)
    .max(6)
    .describe("3–5 line items explaining the score from a base of 50. The score is 50 plus their sum."),
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

// --- Day-to-day encounters: email, websites, text chats -----------------------

const Difficulty = z.number().int().min(1).max(3);

/** Shared request for generated encounters. */
export const EncounterRequestSchema = z.object({
  difficulty: Difficulty,
  wantLegit: z.boolean(),
  weak: z.array(Tactic).max(3),
  avoid: z.array(z.string().max(400)).max(10),
  context: RealWorldContextSchema.optional(),
});
export type EncounterRequest = z.infer<typeof EncounterRequestSchema>;

/** A clue the player should have noticed (scam) or a sign it was genuine (legit). */
const Tell = z.object({
  where: z.string().max(40).describe('Where to look, e.g. "sender", "link", "url", "padlock", "form".'),
  text: z.string().max(300).describe("The exact text the clue refers to, copied from the content."),
  note: z.string().max(400).describe("One sentence explaining why it matters."),
});
export type EncounterTell = z.infer<typeof Tell>;

export const GeneratedEmailSchema = z.object({
  fromName: z.string().max(120),
  fromAddress: z.string().max(160),
  replyTo: z.string().max(160).optional(),
  subject: z.string().max(200),
  receivedAt: z.string().max(40).describe('e.g. "Today, 09:14".'),
  paragraphs: z.array(z.string().max(900)).min(1).max(8).describe("Plain text. Write [link:0], [link:1]… where each link appears."),
  links: z
    .array(z.object({ text: z.string().max(120), shownUrl: z.string().max(200), actualUrl: z.string().max(200) }))
    .max(4)
    .describe("shownUrl is what the email claims; actualUrl is where the link really goes."),
  attachments: z.array(z.object({ name: z.string().max(120), size: z.string().max(20) })).max(3),
  scam: z.boolean(),
  category: z.string().max(40),
  tells: z.array(Tell).min(1).max(6),
  explanation: z.string().max(900),
  targets: z.array(Tactic).max(6),
});
export type GeneratedEmail = z.infer<typeof GeneratedEmailSchema>;

export const GeneratedSiteSchema = z.object({
  kind: z.enum(["login", "shop", "investment", "delivery", "prize", "support", "charity"]),
  brand: z.string().max(80),
  domain: z.string().max(160).describe("The domain shown in the address bar, no protocol."),
  https: z.boolean(),
  domainAgeDays: z.number().int().min(0).max(20000).describe("How long ago the domain was registered."),
  headline: z.string().max(200),
  subheadline: z.string().max(300),
  body: z.array(z.string().max(600)).max(4),
  cta: z.string().max(60),
  formFields: z.array(z.string().max(60)).max(6).describe("Fields the page asks for, e.g. Email, Password, Card number, OTP."),
  products: z.array(z.object({ name: z.string().max(100), price: z.string().max(30), was: z.string().max(30).optional() })).max(4),
  badges: z.array(z.string().max(60)).max(4),
  contact: z.string().max(200),
  footer: z.string().max(300),
  scam: z.boolean(),
  category: z.string().max(40),
  tells: z.array(Tell).min(1).max(6),
  explanation: z.string().max(900),
  targets: z.array(Tactic).max(6),
});
export type GeneratedSite = z.infer<typeof GeneratedSiteSchema>;

/** A text-chat persona: the social engineer (or genuine contact) the player messages with. */
export const ChatPlanSchema = z.object({
  contactName: z.string().max(80),
  contactLabel: z.string().max(80).describe('How the contact appears, e.g. "+91 98301 55012" or "Mum (new number)".'),
  platform: z.enum(["SMS", "WhatsApp", "Instagram", "LinkedIn", "Marketplace"]),
  scam: z.boolean(),
  pattern: z.string().max(80),
  objective: z.string().max(400),
  facts: z.array(z.string().max(300)).min(1).max(6),
  tacticPlan: z.array(Tactic).min(1).max(6),
  opening: z.string().max(500).describe("The first message the contact sends."),
});
export type ChatPlan = z.infer<typeof ChatPlanSchema>;

export const ChatTurnSchema = z.object({
  reply: z.string().max(700).describe("The contact's next message, in texting style."),
  tactics: z.array(Tactic).max(12),
  playerDetected: z.array(Tactic).max(12),
  revealed: z.array(z.string().max(160)).max(12),
  suspicion: z.number().min(0).max(1),
  guardNote: z
    .string()
    .max(200)
    .optional()
    .describe('At most 6 words: what the player just did that changed how guarded they are, e.g. "Asked to verify their identity". Empty if nothing changed.'),
  end: z.enum(["none", "hung-up", "scammed", "exposed", "verified-legit", "rejected-legit"]),
});
export type ChatTurn = z.infer<typeof ChatTurnSchema>;

export const ChatRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    difficulty: Difficulty,
    wantLegit: z.boolean(),
    weak: z.array(Tactic).max(3),
    avoid: z.array(z.string().max(400)).max(10),
    context: RealWorldContextSchema.optional(),
  }),
  z.object({
    action: z.literal("turn"),
    plan: ChatPlanSchema,
    difficulty: Difficulty,
    history: z.array(z.object({ speaker: z.enum(["player", "scammer"]), text: z.string().max(2000) })).min(1).max(40),
  }),
]);

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
  accent: z
    .string()
    .max(200)
    .optional()
    .describe('How the caller sounds, fitted to the player\'s location, e.g. "a natural Indian English accent with a light Bengali lilt".'),
});
export type CallPlan = z.infer<typeof CallPlanSchema>;
