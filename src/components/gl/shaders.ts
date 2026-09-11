/**
 * Hand-written GLSL ES 1.0 fragment shaders (WebGL1 — the widest support).
 * Colours are the design tokens in linear-ish sRGB: ink, ember, amber, bone, signal.
 */

/**
 * Out-of-focus city lights seen through a wet window at night.
 * uRain (0–1) sets how wet the glass is; uNight (0 day – 1 night) sets the
 * sky and how bright the city is. Both come from the player's real local time
 * and, when available, their real weather.
 */
export const CITY_RAIN = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uRain;
uniform float uNight;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Three depth layers of soft bokeh discs drifting like traffic.
vec3 cityLights(vec2 p, float y, float t) {
  vec3 col = vec3(0.0);
  vec3 amber = vec3(0.91, 0.60, 0.28);
  vec3 sodium = vec3(1.0, 0.76, 0.45);
  vec3 red = vec3(0.94, 0.28, 0.20);
  vec3 cool = vec3(0.72, 0.78, 0.86);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float scale = 3.2 + fi * 3.0;
    float dir = mod(fi, 2.0) * 2.0 - 1.0;
    vec2 g = p * scale + vec2(t * (0.012 + fi * 0.008) * dir, fi * 7.3);
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float h = hash(id + fi * 13.7);
    vec2 jitter = (vec2(hash(id + 1.7), hash(id + 5.3)) - 0.5) * 0.6;
    float r = mix(0.18, 0.36, hash(id + 9.1));
    float d = length(f - jitter);
    float disc = smoothstep(r, r * 0.55, d);
    float rim = smoothstep(r, r * 0.92, d) * (1.0 - smoothstep(r * 0.92, r * 0.7, d));
    float on = step(0.48, h);
    float twinkle = 0.78 + 0.22 * sin(t * (0.5 + h * 1.4) + h * 40.0);
    vec3 c = h > 0.94 ? red : (h > 0.82 ? cool : (h > 0.64 ? sodium : amber));
    col += on * c * (disc * 0.75 + rim * 0.4) * twinkle * (0.5 - fi * 0.11);
  }
  // The city sits below the window's horizon.
  return col * smoothstep(1.02, 0.18, y);
}

// One grid of drops. Returns the refraction offset (xy) and coverage (z).
vec3 dropLayer(vec2 p, float t, vec2 cells, float speed, float size, float amount) {
  vec2 st = p * cells;
  vec2 id = floor(st);
  vec2 f = fract(st);
  float h = hash(id + cells.x);
  float live = step(h, amount);
  float fall = speed > 0.0 ? fract(-t * speed * (0.6 + h) + h) : 0.3 + 0.4 * hash(id + 2.2);
  vec2 c = vec2(0.25 + 0.5 * hash(id + 3.3), fall);
  vec2 d = (f - c) * vec2(1.0, cells.x / cells.y); // round drops in tall cells
  float m = smoothstep(size, size * 0.45, length(d)) * live;
  return vec3(d * m, m);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = vec2(uv.x * uRes.x / uRes.y, uv.y);
  float t = uTime;

  vec3 fine = dropLayer(p, t, vec2(46.0, 46.0), 0.0, 0.16, 0.1 + 0.55 * uRain);
  vec3 run1 = dropLayer(p, t, vec2(9.0, 3.0), 0.09, 0.1, uRain);
  vec3 run2 = dropLayer(p + 0.37, t, vec2(13.0, 4.0), 0.12, 0.08, uRain * 0.8);
  vec2 offs = fine.xy * 1.5 + run1.xy * 5.0 + run2.xy * 5.0;
  float mask = clamp(fine.z + run1.z + run2.z, 0.0, 1.0);

  vec3 top = mix(vec3(0.16, 0.155, 0.15), vec3(0.055, 0.047, 0.043), uNight);
  vec3 horizon = mix(vec3(0.30, 0.28, 0.26), vec3(0.23, 0.12, 0.07), uNight);
  vec3 col = mix(horizon, top, smoothstep(0.0, 0.85, uv.y));

  // Behind the glass the city is blurred; through each drop it is sharp and inverted.
  vec3 blurred = cityLights(p + offs * 0.02, uv.y, t);
  vec3 sharp = cityLights(p - offs * 0.9 + vec2(0.0, 0.02), uv.y, t);
  vec3 lights = mix(blurred, sharp * 1.25, mask * 0.85);
  col += lights * mix(0.45, 1.0, uNight);
  col += mask * 0.035;

  col *= 0.4 + 0.6 * pow(16.0 * uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y), 0.22);
  col = col / (1.0 + col * 0.55);
  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * An anonymous caller: a backlit head-and-shoulders silhouette against a warm
 * halo, printed as a rotated halftone screen. The figure's proportions and
 * tilt come from uSeed (the caller's name), so every caller is distinct.
 * uLevel (0–~0.5) is the caller's live voice level — the halo pulses as they speak.
 */
export const HALFTONE_PORTRAIT = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uSeed;
uniform float uLevel;
// The district's light (default: sodium amber).
uniform float uTintR;
uniform float uTintG;
uniform float uTintB;

float hash(float n) { return fract(sin(n) * 43758.5453123); }

float sdEllipse(vec2 p, vec2 r) {
  float k0 = length(p / r);
  float k1 = length(p / (r * r));
  return k0 * (k0 - 1.0) / max(k1, 1e-4);
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// Head-and-shoulders bust in units of frame height, sized to fit a 3:4 frame
// (x within ±0.34). Every part overlaps its neighbour so smin blends real
// joints — no part meets another at a single point (that read as a keyhole).
float figure(vec2 p) {
  float a = hash(uSeed);
  float b = hash(uSeed + 1.7);
  float c = hash(uSeed + 3.1);
  float breathe = sin(uTime * 0.9) * 0.005;
  // Head: slightly tilted, jaw narrower than the crown.
  vec2 hp = p - vec2((c - 0.5) * 0.03, 0.145 + breathe);
  float ang = (a - 0.5) * 0.2;
  hp = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * hp;
  hp.x *= 1.0 + smoothstep(0.0, -0.13, hp.y) * 0.25;
  float head = sdEllipse(hp, vec2(0.1 + 0.014 * a, 0.132 + 0.012 * b));
  // Neck: a column sunk into both the jaw and the shoulders.
  float neck = sdRoundBox(p - vec2(0.0, -0.02 + breathe * 0.5), vec2(0.05 + 0.008 * c, 0.08), 0.03);
  // Shoulders: a wide shallow ellipse; the large smin with the neck makes the trapezius slope.
  float shoulders = sdEllipse(p - vec2(0.0, -0.225 + breathe * 0.4), vec2(0.29 + 0.035 * b, 0.13));
  float chest = sdRoundBox(p - vec2(0.0, -0.52), vec2(0.28 + 0.035 * b, 0.26), 0.08);
  float torso = smin(shoulders, chest, 0.05);
  return smin(smin(head, neck, 0.03), torso, 0.11);
}

float scene(vec2 p) {
  float d = figure(p);
  float inside = smoothstep(0.004, -0.004, d);
  float halo = exp(-length((p - vec2(0.05, 0.15)) * vec2(1.0, 0.85)) * 2.4);
  float bg = 0.08 + 0.85 * halo * (1.0 + uLevel * 1.8);
  vec2 e = vec2(0.003, 0.0);
  vec2 n = normalize(vec2(figure(p + e.xy) - figure(p - e.xy), figure(p + e.yx) - figure(p - e.yx)) + 1e-6);
  float rim = smoothstep(0.035, 0.0, -d) * inside * clamp(dot(n, normalize(vec2(0.7, 0.5))), 0.0, 1.0);
  return mix(bg, 0.03 + rim * 0.85, inside);
}

void main() {
  float cell = max(5.0, uRes.y / 95.0);
  mat2 rot = mat2(0.7071, 0.7071, -0.7071, 0.7071);
  mat2 inv = mat2(0.7071, -0.7071, 0.7071, 0.7071);
  vec2 q = rot * gl_FragCoord.xy / cell;
  vec2 id = floor(q);
  vec2 f = fract(q) - 0.5;
  // Sample the scene once per halftone cell, at the cell's centre.
  vec2 centre = inv * ((id + 0.5) * cell);
  vec2 p = (centre - 0.5 * uRes) / uRes.y;
  float L = clamp(scene(p), 0.0, 1.0);
  float r = sqrt(L) * 0.68;
  float dotMask = smoothstep(r, r - 0.12, length(f));

  vec3 ink = vec3(0.102, 0.071, 0.051);
  vec3 amber = vec3(uTintR, uTintG, uTintB);
  vec3 bone = vec3(0.94, 0.92, 0.88);
  vec3 col = mix(ink, mix(amber, bone, smoothstep(0.75, 1.0, L)), dotMask);

  vec2 uv = gl_FragCoord.xy / uRes;
  col *= 0.55 + 0.45 * pow(16.0 * uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y), 0.3);
  gl_FragColor = vec4(col, 1.0);
}
`;
