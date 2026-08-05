export const ATTENDANCE_STATUSES = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LEAVE: "Leave",
};

export const ATTENDANCE_STATUS_OPTIONS = [
  { value: "Present", label: "Present" },
  { value: "Absent", label: "Absent" },
  { value: "Leave", label: "Leave" },
];

// Badge colors for these statuses live in theme/tokens/domainColors.js
// (single source of truth, consumed by AttendanceTable).
