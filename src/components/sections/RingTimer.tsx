"use client";

import { useEffect, useRef, useState } from "react";

/** Counts ringing time once the call is on screen. */
export function RingTimer({ className }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let id: ReturnType<typeof setInterval> | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      clearInterval(id);
      if (entry?.isIntersecting) id = setInterval(() => setSeconds((s) => Math.min(s + 1, 59 * 60)), 1000);
    });
    observer.observe(el);
    return () => {
      clearInterval(id);
      observer.disconnect();
    };
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <span ref={ref} className={className} aria-hidden>
      {mm}:{ss}
    </span>
  );
}
