// Performance scores are captured on a 0–5 numeric scale (see
// PerformanceReviewForm: SCORE_MIN / SCORE_MAX). Across the app we present
// them to reviewers as qualitative bands rather than raw numbers.

export const PERFORMANCE_BANDS = [
  "Poor",
  "Needs Improvement",
  "Meets Expectations",
  "Exceeds Expectations",
  "Outstanding",
];

function toScore(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

/**
 * Map a 0–5 score to one of the five performance bands.
 * Returns "-" when there is no usable score.
 */
export function performanceBandLabel(value) {
  const score = toScore(value);
  if (score === null) return "-";
  if (score < 1.5) return "Poor";
  if (score < 2.5) return "Needs Improvement";
  if (score < 3.5) return "Meets Expectations";
  if (score < 4.5) return "Exceeds Expectations";
  return "Outstanding";
}

/**
 * Average of the day-to-day, work and behavioral scores (ignoring any that
 * are missing). Returns null when none are present.
 */
export function averagePerformanceScore(row = {}) {
  const scores = [
    row.day_to_day_performance,
    row.work_performance,
    row.behavioral_performance,
  ]
    .map(toScore)
    .filter((n) => n !== null);

  if (!scores.length) return null;
  return scores.reduce((sum, n) => sum + n, 0) / scores.length;
}

/** Averaged performance expressed as a band label. */
export function averagePerformanceBand(row = {}) {
  const avg = averagePerformanceScore(row);
  return avg === null ? "-" : performanceBandLabel(avg);
}

/** Tailwind classes for a coloured pill, keyed by band label. */
export function performanceBandClass(label) {
  const ring = "ring-1 ring-inset";
  switch (label) {
    case "Outstanding":
      return `bg-emerald-50 text-emerald-700 ${ring} ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/25`;
    case "Exceeds Expectations":
      return `bg-teal-50 text-teal-700 ${ring} ring-teal-500/20 dark:bg-teal-500/15 dark:text-teal-300 dark:ring-teal-400/25`;
    case "Meets Expectations":
      return `bg-blue-50 text-blue-700 ${ring} ring-blue-500/20 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-400/25`;
    case "Needs Improvement":
      return `bg-amber-50 text-amber-700 ${ring} ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/25`;
    case "Poor":
      return `bg-rose-50 text-rose-700 ${ring} ring-rose-500/20 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/25`;
    default:
      return `bg-slate-100 text-slate-600 ${ring} ring-slate-500/15 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10`;
  }
}
