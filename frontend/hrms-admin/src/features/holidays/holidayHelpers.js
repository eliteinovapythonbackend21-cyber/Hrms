/* ============================================================
   SHARED HOLIDAY HELPERS
   Used by both HolidayListPage (list-only) and
   HolidayCalendarPage (calendar + government/Sunday sync).
============================================================ */

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

export const COUNTRY_OPTIONS = [
  { code: "IN", label: "India (Tamil Nadu)" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "AE", label: "UAE" },
  { code: "AU", label: "Australia" },
  { code: "CA", label: "Canada" },
];

export function parseHolidayDate(value) {
  if (!value) {
    return null;
  }

  const raw = String(value).slice(0, 10);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]) - 1,
    day: Number(match[3]),
  };
}

export function holidayDateKey(value) {
  const parsed = parseHolidayDate(value);

  if (!parsed) {
    return "";
  }

  return (
    `${parsed.year}-` +
    `${String(parsed.month + 1).padStart(2, "0")}-` +
    `${String(parsed.day).padStart(2, "0")}`
  );
}

export function toISODate(year, month, day) {
  return (
    `${year}-` +
    `${String(month + 1).padStart(2, "0")}-` +
    `${String(day).padStart(2, "0")}`
  );
}

export function getHolidayType(holiday) {
  return holiday?.holiday_type || "Office";
}

export function getCalendarDateKey(year, month, day) {
  return toISODate(year, month, day);
}
