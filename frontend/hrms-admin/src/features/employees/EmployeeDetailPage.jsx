import { useParams, useNavigate } from "react-router-dom";
import { useEmployee } from "./useEmployees";
import LoadingSpinner from "@/components/feedback/LoadingSpinner";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import DetailList from "@/components/ui/DetailList";
import { formatDate, formatDateTime } from "@/utils/formatDate";
import { formatCurrency } from "@/utils/formatCurrency";

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: employee, isLoading, isError } = useEmployee(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="text-center py-16 text-slate-500 dark:text-slate-400">
        Employee not found.
      </div>
    );
  }

  const infoRows = [
    { label: "Employee Code", value: employee.employee_code },
    { label: "Department", value: employee.department?.department_name || "-" },
    { label: "Designation", value: employee.designation?.designation_name || "-" },
    { label: "Gender", value: employee.gender || "-" },
    { label: "Date of Birth", value: formatDate(employee.dob) },
    { label: "Phone", value: employee.phone || "-" },
    { label: "Emergency Contact", value: employee.emergency_contact || "-" },
    { label: "Address", value: employee.address || "-" },
    { label: "City", value: employee.city || "-" },
    { label: "State", value: employee.state || "-" },
    { label: "Country", value: employee.country || "-" },
    { label: "Pincode", value: employee.pincode || "-" },
    { label: "Joining Date", value: formatDate(employee.joining_date) },
    { label: "Salary", value: formatCurrency(employee.salary) },
    { label: "Allowance", value: formatCurrency(employee.allowance) },
    { label: "PF Number", value: employee.pf_number || "-" },
    { label: "ESI Number", value: employee.esi_number || "-" },
    { label: "Bank Account No.", value: employee.account_number || "-" },
    { label: "Created", value: formatDateTime(employee.created_at) },
  ];

  const counts = [
    { label: "Attendance", value: employee.attendance_count },
    { label: "Leaves", value: employee.leave_count },
    { label: "Network Logs", value: employee.network_log_count },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Employee Details
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate("/employees")}>
            Back
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/employees/${id}/edit`)}>
            Edit
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/employees/${id}/payslip`)}>
            Payslip
          </Button>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Avatar name={employee.first_name || "E"} size="lg" />
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {employee.first_name} {employee.last_name}
            </h2>
            <Badge
              className={
                employee.is_active
                  ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                  : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
              }
            >
              {employee.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {counts.map((c) => (
            <div key={c.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{c.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{c.label}</p>
            </div>
          ))}
        </div>

        <DetailList rows={infoRows} />
      </div>
    </div>
  );
}
