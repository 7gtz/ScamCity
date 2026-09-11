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

type GenerateOptions = {
  model: string | readonly string[];
  system: string;
  prompt: string;
  temperature?: number;
  /** Sequential mode: per attempt, not total. */
  timeoutMs?: number;
  /**
   * Hedged mode: start the next model in the chain if nothing has answered
   * after this long (or at once if a model fails), and take the first valid
   * answer. For the player-facing waits — judging, chat replies.
   */
  hedgeMs?: number;
  /** Hedged mode: the total time allowed for the whole chain. */
  budgetMs?: number;
};

/**
 * Structured generation: the model is constrained to the schema, and the
 * result is validated by the same schema before anything trusts it.
 * `model` may be a fallback chain: when one model is overloaded (503/429),
 * slow, or returns something that fails validation, the next one answers.
 */
export async function generateJson<T extends z.ZodType>(schema: T, opts: GenerateOptions): Promise<z.infer<T>> {
  const chain = typeof opts.model === "string" ? [opts.model] : [...opts.model];
  const responseJsonSchema = toResponseSchema(schema);

  const attempt = async (model: string, signal: AbortSignal) => {
    const started = Date.now();
    try {
      const res = await gemini().models.generateContent({
        model,
        contents: opts.prompt,
        config: {
          systemInstruction: opts.system,
          responseMimeType: "application/json",
          responseJsonSchema,
          temperature: opts.temperature ?? 0.3,
          abortSignal: signal,
        },
      });
      const parsed = schema.parse(JSON.parse(res.text ?? "")) as z.infer<T>;
      console.info(`[gemini] ${model} ok in ${Date.now() - started}ms`);
      return parsed;
    } catch (err) {
      const reason = err instanceof Error ? err.message.slice(0, 160) : String(err);
      console.warn(`[gemini] ${model} failed after ${Date.now() - started}ms: ${reason}`);
      throw err;
    }
  };

  if (opts.hedgeMs === undefined) {
    let lastError: unknown;
    for (const model of chain) {
      try {
        return await attempt(model, AbortSignal.timeout(opts.timeoutMs ?? 10_000));
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }

  const hedgeMs = opts.hedgeMs;
  const budget = AbortSignal.timeout(opts.budgetMs ?? 10_000);
  return new Promise<z.infer<T>>((resolve, reject) => {
    const controllers: AbortController[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    let launched = 0;
    let failed = 0;
    let done = false;
    let lastError: unknown = new Error("No model answered");

    const settle = () => {
      done = true;
      timers.forEach(clearTimeout);
      controllers.forEach((c) => c.abort());
    };
    const launchNext = () => {
      if (done || launched >= chain.length) return;
      const model = chain[launched++]!;
      const controller = new AbortController();
      controllers.push(controller);
      attempt(model, AbortSignal.any([controller.signal, budget])).then(
        (value) => {
          if (done) return;
          settle();
          resolve(value);
        },
        (err: unknown) => {
          if (done) return;
          lastError = err;
          failed++;
          if (failed >= chain.length || budget.aborted) {
            settle();
            reject(lastError);
          } else launchNext();
        },
      );
      if (launched < chain.length) timers.push(setTimeout(launchNext, hedgeMs));
    };
    launchNext();
  });
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
