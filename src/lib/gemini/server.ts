import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

let client: GoogleGenAI | null = null;

export const hasGemini = () => Boolean(process.env.GEMINI_API_KEY);

/** Server-only client. The long-lived key never reaches the browser. */
export function gemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

/** Zod → JSON Schema for Gemini's `responseJsonSchema`. */
export function toResponseSchema(schema: z.ZodType) {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

/**
 * Structured generation: the model is constrained to the schema, and the
 * result is validated by the same schema before anything trusts it.
 */
export async function generateJson<T extends z.ZodType>(
  schema: T,
  opts: { model: string; system: string; prompt: string; temperature?: number; timeoutMs?: number },
): Promise<z.infer<T>> {
  const res = await gemini().models.generateContent({
    model: opts.model,
    contents: opts.prompt,
    config: {
      systemInstruction: opts.system,
      responseMimeType: "application/json",
      responseJsonSchema: toResponseSchema(schema),
      temperature: opts.temperature ?? 0.3,
      abortSignal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
    },
  });
  return schema.parse(JSON.parse(res.text ?? ""));
}

/** `[01:42] CALLER: …` lines, the format every model prompt uses. */
export function formatTranscript(turns: { speaker: "player" | "scammer"; text: string; at: number }[]) {
  return turns
    .map((t) => {
      const s = Math.round(t.at / 1000);
      const stamp = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
      return `[${stamp}] ${t.speaker === "scammer" ? "CALLER" : "PLAYER"}: ${t.text}`;
    })
    .join("\n");
}
