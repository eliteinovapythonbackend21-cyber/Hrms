export const LEAVE_STATUSES = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const LEAVE_STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
];

// Badge colors for these statuses live in theme/tokens/domainColors.js
// (single source of truth, consumed by LeaveStatusBadge).
