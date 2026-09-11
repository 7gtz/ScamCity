import type { RealWorldContext } from "./types";

/** WMO weather interpretation codes (open-meteo) → plain words. */
function describeWeather(code: number) {
  if (code === 0) return "clear skies";
  if (code <= 3) return "cloudy";
  if (code <= 48) return "fog";
  if (code <= 57) return "drizzle";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "heavy showers";
  return "thunderstorms";
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

function currentPosition(): Promise<GeolocationPosition | null> {
  if (!("geolocation" in navigator)) return Promise.resolve(null);
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
      timeout: 6000,
      maximumAge: 10 * 60_000,
    }),
  );
}

/**
 * Where and when the player is. Always available from the device clock and
 * timezone; with consent, GPS adds the real city and live weather — which the
 * caller then uses to sound local and to invent believable urgency.
 */
export async function getRealWorldContext(precise: boolean): Promise<RealWorldContext> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const base: RealWorldContext = {
    timezone,
    localTime: new Intl.DateTimeFormat("en-GB", { weekday: "long", hour: "2-digit", minute: "2-digit" }).format(new Date()),
    locale: navigator.language,
    city: timezone.split("/").at(-1)?.replace(/_/g, " "),
    source: "timezone",
  };
  if (!precise) return base;

  const pos = await currentPosition();
  if (!pos) return base;
  const { latitude, longitude } = pos.coords;

  const [place, weather] = await Promise.all([
    fetchJson<{ city?: string; locality?: string; principalSubdivision?: string; countryName?: string }>(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
    ),
    fetchJson<{ current?: { temperature_2m: number; weather_code: number } }>(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`,
    ),
  ]);

  return {
    ...base,
    city: place?.city || place?.locality || base.city,
    region: place?.principalSubdivision || undefined,
    country: place?.countryName || undefined,
    weather: weather?.current
      ? `${describeWeather(weather.current.weather_code)}, ${Math.round(weather.current.temperature_2m)}°C`
      : undefined,
    source: "gps",
  };
}

/** "Leeds · Thursday 14:05 · light rain, 11°C" */
export const describeContext = (ctx: RealWorldContext) =>
  [ctx.city, ctx.localTime, ctx.weather].filter(Boolean).join(" · ");
