import { TACTICS } from "@/content/tactics";
import type { EncounterRequest } from "@/lib/validation/schemas";

/** The part of every encounter prompt that aims it at this player, here. */
export function encounterBrief(req: Pick<EncounterRequest, "difficulty" | "wantLegit" | "weak" | "avoid" | "context">) {
  const place = req.context ? [req.context.city, req.context.country].filter(Boolean).join(", ") : "";
  const level =
    req.difficulty === 1
      ? "Difficulty 1: clear tells a careful person catches."
      : req.difficulty === 2
        ? "Difficulty 2: polished; tells are subtle."
        : "Difficulty 3: very convincing; only one or two small tells.";
  return [
    req.wantLegit
      ? "Make this GENUINE (scam: false) — ordinary and honest, though a nervous person might wrongly distrust it. Its tells are the signs that it is genuine."
      : "Make this a SCAM (scam: true) modelled on documented real-world patterns.",
    level,
    !req.wantLegit && req.weak.length
      ? `The player keeps missing: ${req.weak.map((t) => `${t} (${TACTICS[t].description})`).join("; ")}. Lean on those.`
      : "",
    place ? `Localise for a player in ${place}: currency, conventions, local-sounding fictional organisations.` : "",
    req.context
      ? `It is ${req.context.localTime} for the player${req.context.weather ? `, and the weather there is ${req.context.weather}` : ""}. Make it plausible for this exact moment (time of day, day of week, weather as a pretext).`
      : "",
    req.avoid.length ? `Do not repeat these recent ones:\n${req.avoid.map((a) => `- ${a}`).join("\n")}` : "",
    "Use plausible but FICTIONAL organisations and domains. Never a real brand. Tells must quote text that appears exactly in the content.",
  ]
    .filter(Boolean)
    .join("\n");
}
