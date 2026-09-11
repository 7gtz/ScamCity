"use client";

import { useEffect } from "react";
import { useFreestyle } from "@/features/freestyle/freestyle-store";
import { useProgressStore } from "@/features/progress/progress-store";
import { useResultsStore } from "@/features/scoring/results-store";

/** Rehydrates persisted stores after mount so server and client HTML match. */
export function StoreHydrator() {
  useEffect(() => {
    void useProgressStore.persist.rehydrate();
    void useResultsStore.persist.rehydrate();
    void useFreestyle.persist.rehydrate();
  }, []);
  return null;
}
