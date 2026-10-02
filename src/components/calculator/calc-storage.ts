"use client";

import { CALC_STORAGE_KEY, parseCalculatorInput, type CalculatorInput } from "@/lib/calculator";

interface Stored {
  input: CalculatorInput;
  /** True once the visitor actually changed something or pressed "Оставить заявку". */
  attached: boolean;
  savedAt: number;
}

const TTL = 30 * 24 * 3600 * 1000;

export function loadCalc(): Stored | null {
  try {
    const raw = localStorage.getItem(CALC_STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    const input = parseCalculatorInput(s.input);
    if (!input || Date.now() - s.savedAt > TTL) return null;
    return { ...s, input };
  } catch {
    return null;
  }
}

export function saveCalc(input: CalculatorInput, attached: boolean) {
  try {
    localStorage.setItem(CALC_STORAGE_KEY, JSON.stringify({ input, attached, savedAt: Date.now() } satisfies Stored));
  } catch {
    /* storage unavailable — the form still works without the calculation */
  }
}

export function detachCalc() {
  const s = loadCalc();
  if (s) saveCalc(s.input, false);
}
