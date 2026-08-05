import { useNavigate } from "react-router-dom";
import { useLeaveApprovals } from "./useLeaveApprovals";
import DataTable from "@/components/table/DataTable";
import LeaveStatusBadge from "./components/LeaveStatusBadge";
import { usePagination } from "@/hooks/usePagination";
import { useTableExport } from "@/hooks/useTableExport";
import TablePagination from "@/components/table/TablePagination";
import TableToolbar from "@/components/table/TableToolbar";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/feedback/Toast";
import { formatDate } from "@/utils/formatDate";
import { leavesApi } from "@/api/leaves.api";

const EXPORT_COLUMNS = [
  { header: "Employee", accessor: (r) => (r.employee ? `${r.employee.first_name} ${r.employee.last_name}`.trim() : null) },
  { header: "Leave Type", accessor: (r) => r.leave_type?.name },
  { header: "From", accessor: (r) => formatDate(r.from_date) },
  { header: "To", accessor: (r) => formatDate(r.to_date) },
  { header: "Days", accessor: (r) => r.total_days },
  { header: "Reason", accessor: (r) => r.reason },
  { header: "Status", accessor: (r) => r.status },
];

export default function LeaveApprovalsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { params, page, perPage, setPage, setPerPage } = usePagination();

  // Backend has no `status` query param — list_leaves only reads `search`
  // (ilike over the status column, among others) and `leave_type`.
  const queryParams = { ...params, search: "Pending" };
  const { leaves, approve, reject } = useLeaveApprovals(queryParams);

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: leavesApi.list,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "leave-approvals",
    title: "Pending Leave Approvals",
  });

  const handleApprove = async (id) => {
    try {
      await approve.mutateAsync(id);
      showToast("Leave approved", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to approve", "error");
    }
  };

  const handleReject = async (id) => {
    try {
      await reject.mutateAsync(id);
      showToast("Leave rejected", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to reject", "error");
    }
  };

  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: (r) =>
        r.employee ? `${r.employee.first_name} ${r.employee.last_name}`.trim() : "-",
    },
    { key: "leave_type", label: "Leave Type", render: (r) => r.leave_type?.name || "-" },
    { key: "from_date", label: "From", render: (r) => formatDate(r.from_date) },
    { key: "to_date", label: "To", render: (r) => formatDate(r.to_date) },
    { key: "total_days", label: "Days" },
    { key: "reason", label: "Reason", render: (r) => r.reason || "-" },
    { key: "status", label: "Status", render: (r) => <LeaveStatusBadge status={r.status} /> },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleApprove(r.id)}
            isLoading={approve.isPending && approve.variables === r.id}
          >
            Approve
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleReject(r.id)}
            isLoading={reject.isPending && reject.variables === r.id}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Leave Approvals
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review pending leave requests
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar
            onRefresh={leaves.refetch}
            refreshing={leaves.isFetching}
            onExportExcel={exportExcel}
            onExportPDF={exportPDF}
            exporting={exporting}
          />
          <Button variant="secondary" onClick={() => navigate("/leaves")}>
            Back
          </Button>
        </div>
      </div>

      <div className="card">
        <DataTable columns={columns} data={leaves.data?.items || []} loading={leaves.isLoading} />
        <TablePagination
          page={page}
          pages={leaves.data?.pages || 1}
          total={leaves.data?.total || 0}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
        />
      </div>
    </div>
  );
}
