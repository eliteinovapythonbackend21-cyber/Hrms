import { useLeaves, useApproveLeave, useRejectLeave } from "./useLeaves";

// Approvals page reuses the leave list filtered to Pending status.
// This hook centralizes the pending leaves + approve/reject actions.
export function useLeaveApprovals(params) {
  const leaves = useLeaves(params);
  const approve = useApproveLeave();
  const reject = useRejectLeave();

  return {
    leaves,
    approve,
    reject,
  };
}
