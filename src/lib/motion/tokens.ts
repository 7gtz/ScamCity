/** Motion tokens for `motion` (framer) — same values as tokens.css and gsap.ts. */
export const ease = [0.16, 1, 0.3, 1] as const;
export const easeExit = [0.7, 0, 0.84, 0] as const;

export const duration = {
  micro: 0.18,
  ui: 0.32,
  reveal: 0.9,
  headline: 1.1,
  wipe: 1.4,
  count: 1.2,
} as const;

export const enter = { duration: duration.ui, ease } as const;
export const exit = { duration: duration.ui * 0.6, ease: easeExit } as const;
