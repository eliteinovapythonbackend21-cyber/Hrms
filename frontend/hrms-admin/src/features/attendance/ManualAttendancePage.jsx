import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ManualAttendanceForm from "./components/ManualAttendanceForm";
import {
  useManualAttendance,
  useManualAttendanceList,
  useUpdateManualAttendance,
  useDeactivateManualAttendance,
} from "./useCheckInOut";
import { useToast } from "@/components/feedback/Toast";
import { usePagination } from "@/hooks/usePagination";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/table/DataTable";
import TablePagination from "@/components/table/TablePagination";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import Badge from "@/components/ui/Badge";
import { domainColors } from "@/theme/tokens/domainColors";
import { formatDate, formatTime } from "@/utils/formatDate";

export default function ManualAttendancePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { params, page, perPage, setPage, setPerPage, sortBy, sortDir, toggleSort } = usePagination();

  const manualAttendance = useManualAttendance();
  const { data, isLoading, isError } = useManualAttendanceList(params);
  const updateEntry = useUpdateManualAttendance();
  const deactivateEntry = useDeactivateManualAttendance();

  const [editing, setEditing] = useState(null);
  const [confirmEntry, setConfirmEntry] = useState(null);

  const handleCreate = async (payload) => {
    try {
      await manualAttendance.mutateAsync(payload);
      showToast("Manual attendance recorded", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to record attendance", "error");
    }
  };

  const handleUpdate = async (payload) => {
    try {
      await updateEntry.mutateAsync({ id: editing.id, payload });
      showToast("Manual attendance updated", "success");
      setEditing(null);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update entry", "error");
    }
  };

  const handleDeactivate = async () => {
    if (!confirmEntry) return;
    try {
      await deactivateEntry.mutateAsync(confirmEntry.id);
      showToast("Manual attendance deactivated", "success");
      setConfirmEntry(null);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to deactivate entry", "error");
    }
  };

  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: (r) => (r.employee ? `${r.employee.first_name} ${r.employee.last_name}`.trim() : "-"),
    },
    { key: "attendance_date", label: "Date", sortable: true, render: (r) => formatDate(r.attendance_date) },
    { key: "check_in", label: "Check In", sortable: true, render: (r) => formatTime(r.check_in) },
    { key: "check_out", label: "Check Out", sortable: true, render: (r) => formatTime(r.check_out) },
    {
      key: "attendance_status",
      label: "Status",
      sortable: true,
      render: (r) => (
        <Badge className={domainColors.attendanceStatus[r.attendance_status] || "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300"}>
          {r.attendance_status}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(r)} className="text-primary-600 hover:underline text-sm">
            Edit
          </button>
          {r.is_active && (
            <button onClick={() => setConfirmEntry(r)} className="text-red-600 hover:underline text-sm">
              Deactivate
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manual Attendance</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Record and manage admin-entered attendance
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate("/attendance")} className="w-full sm:w-auto">
          Back
        </Button>
      </div>

      <div className="card p-6 mb-6">
        <ManualAttendanceForm onSubmit={handleCreate} loading={manualAttendance.isPending} />
      </div>

      <div className="card">
        {isError && (
          <div className="p-4 text-red-600 dark:text-red-400">Failed to load manual attendance entries.</div>
        )}
        <DataTable
          columns={columns}
          data={data?.items || []}
          loading={isLoading}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={toggleSort}
        />
        <TablePagination
          page={page}
          pages={data?.pages || 1}
          total={data?.total || 0}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
        />
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Manual Attendance" size="lg">
        {editing && (
          <ManualAttendanceForm initialData={editing} onSubmit={handleUpdate} loading={updateEntry.isPending} />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmEntry}
        onClose={() => setConfirmEntry(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Entry"
        message="Are you sure you want to deactivate this manual attendance entry?"
        confirmText="Deactivate"
        loading={deactivateEntry.isPending}
      />
    </div>
  );
}
