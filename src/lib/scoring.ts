import { ExerciseDirection } from "@prisma/client";

export function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, n));
}

export function roundToStep(value: number, step = 0.5) {
  if (!step || step <= 0) return value;
  return Math.round(value / step) * step;
}

export function normalizeTo100(args: {
  raw: number;
  best: number;
  worst: number;
  direction: ExerciseDirection;
  step?: number;
}) {
  const { raw, best, worst, direction, step = 0.5 } = args;

  if (best === worst) return 100;

  let score: number;
  if (direction === "HIGHER_BETTER") {
    score = ((raw - worst) / (best - worst)) * 100;
  } else {
    // LOWER_BETTER: best is lower, worst is higher
    score = ((worst - raw) / (worst - best)) * 100;
  }

  score = clamp(score, 0, 100);
  return roundToStep(score, step);
}

export function trendDirection(delta: number) {
  if (delta >= 2) return "UP";
  if (delta <= -2) return "DOWN";
  return "NEUTRAL";
}
