/**
 * Server-boundary schemas and Gemini tool declarations for the NPC layer.
 *
 * Deliberately separate from `src/lib/validation/schemas.ts`: that file is
 * shared with the scam-call mode, and keeping the NPC contract here means the
 * two Act 2 workstreams never edit the same file.
 */

import { Type, type FunctionDeclaration } from "@google/genai";
import { z } from "zod";
import { RealWorldContextSchema } from "@/lib/validation/schemas";
import { NPC_IDS } from "./types";

const NpcIdSchema = z.enum(NPC_IDS as [string, ...string[]]);

/** The slice of game state an NPC is told about before it speaks. */
export const NpcDossierSchema = z.object({
  /** Evidence ids the detective is carrying. */
  evidence: z.array(z.string().max(64)).max(32),
  /** Deduction flags already unlocked. */
  deductions: z.array(z.string().max(64)).max(32),
  /** Whole minutes left on the clearing window; 0 once expired. */
  minutesLeft: z.number().int().min(0).max(60),
  /** Case flags this NPC would plausibly know about. */
  flags: z.record(z.string().max(64), z.union([z.boolean(), z.number(), z.string().max(200)])),
});
export type NpcDossier = z.infer<typeof NpcDossierSchema>;

export const NpcTokenRequestSchema = z.object({
  npc: NpcIdSchema,
  dossier: NpcDossierSchema,
  /** Where and when the player actually is — accent, time of day, weather. */
  context: RealWorldContextSchema.optional(),
});
export type NpcTokenRequest = z.infer<typeof NpcTokenRequestSchema>;

export const NpcChatRequestSchema = z.object({
  npc: NpcIdSchema,
  dossier: NpcDossierSchema,
  /** The conversation so far, oldest first. */
  turns: z
    .array(z.object({ speaker: z.enum(["player", "npc"]), text: z.string().max(2000) }))
    .max(40),
  message: z.string().min(1).max(2000),
  context: RealWorldContextSchema.optional(),
});
export type NpcChatRequest = z.infer<typeof NpcChatRequestSchema>;

/* -------------------------------------------------------------------------- */
/* Tool declarations                                                          */
/* -------------------------------------------------------------------------- */

const giveEvidence: FunctionDeclaration = {
  name: "give_evidence",
  description:
    "Hand the detective a document or record you physically have. Call this the moment you agree to show or give them something.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      evidence: {
        type: Type.STRING,
        enum: ["bank-statement", "call-log", "otp-message", "sim-swap-record", "repair-receipt", "delivery-notice"],
        description: "Which item you are handing over.",
      },
    },
    required: ["evidence"],
  },
};

const authorizeFreeze: FunctionDeclaration = {
  name: "authorize_freeze",
  description:
    "Place an emergency fraud hold on the pending transfer. Only call this once the detective has stated specific grounds: what was taken, when, and why the timestamps prove fraud.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      grounds: { type: Type.STRING, description: "The grounds the detective gave, in one sentence." },
    },
    required: ["grounds"],
  },
};

const accuseSuspect: FunctionDeclaration = {
  name: "accuse_suspect",
  description:
    "Record that the detective has directly accused someone of the crime. Call this only when they make a real accusation, not when they merely ask questions.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      suspect: {
        type: Type.STRING,
        enum: ["ravi", "vance", "mara", "unknown"],
        description: "Who they accused.",
      },
    },
    required: ["suspect"],
  },
};

const clearLead: FunctionDeclaration = {
  name: "clear_lead",
  description:
    "Record that a line of enquiry has been ruled out on the evidence. Call this when the detective concludes, correctly, that it is a dead end.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      lead: {
        type: Type.STRING,
        enum: ["repair-shop", "delivery"],
        description: "Which lead was ruled out.",
      },
    },
    required: ["lead"],
  },
};

const lodgeReport: FunctionDeclaration = {
  name: "lodge_report",
  description:
    "File the formal fraud report. Only call this after the detective has summarised the whole chain: the spoofed call, the OTP, the transfer, and the bank hold.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING, description: "The chain as the detective described it." },
    },
    required: ["summary"],
  },
};

const endConversation: FunctionDeclaration = {
  name: "end_conversation",
  description: "End this conversation. Call this right after your closing line when there is nothing left to say.",
  parameters: { type: Type.OBJECT, properties: {}, required: [] },
};

/** Everything an NPC may attempt. Per-NPC subsets are chosen in the token route. */
export const NPC_TOOL_DECLARATIONS: Record<string, FunctionDeclaration> = {
  give_evidence: giveEvidence,
  authorize_freeze: authorizeFreeze,
  accuse_suspect: accuseSuspect,
  clear_lead: clearLead,
  lodge_report: lodgeReport,
  end_conversation: endConversation,
};
