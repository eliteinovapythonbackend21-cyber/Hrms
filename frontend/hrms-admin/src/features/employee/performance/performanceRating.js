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
  switch (label) {
    case "Outstanding":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
    case "Exceeds Expectations":
      return "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300";
    case "Meets Expectations":
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
    case "Needs Improvement":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
    case "Poor":
      return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300";
  }
}
