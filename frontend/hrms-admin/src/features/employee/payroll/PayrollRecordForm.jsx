import { useState } from "react";
import GenericForm from "@/components/form/GenericForm";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useEmployeeOptions } from "@/hooks/useLookupOptions";
import { attendanceApi } from "@/api/attendance.api";
import { useToast } from "@/components/feedback/Toast";

const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Paid", label: "Paid" },
];

function normalizeId(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? n : "";
}

function normalizeAmount(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? n : "";
}

function parsePayMonth(payMonth) {
  const match = String(payMonth || "").match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) };
}

export default function PayrollRecordForm({
  formId = "payroll-form",
  initialData,
  isEdit,
  onSubmit,
  onCancel,
  loading,
}) {
  const employeeOptions = useEmployeeOptions();
  const { showToast } = useToast();

  const initialEmployeeId = normalizeId(
    initialData?.employee_id ?? initialData?.employee?.id ?? ""
  );
  const [employeeId, setEmployeeId] = useState(initialEmployeeId);
  const [payMonth, setPayMonth] = useState(initialData?.pay_month || "");
  const [employeeError, setEmployeeError] = useState("");
  const [payMonthError, setPayMonthError] = useState("");

  const [fetchingSummary, setFetchingSummary] = useState(false);
  const [autoFillValues, setAutoFillValues] = useState(null);

  const fields = [
    { name: "gross_salary", label: "Gross Salary", type: "number", required: true },
    { name: "deductions", label: "Deductions", type: "number" },
    { name: "net_salary", label: "Net Salary", type: "number", required: true },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: STATUS_OPTIONS,
      defaultValue: "Pending",
    },
  ];

  const baseInitialData = {
    gross_salary: normalizeAmount(initialData?.gross_salary),
    deductions: normalizeAmount(initialData?.deductions),
    net_salary: normalizeAmount(initialData?.net_salary),
    status: initialData?.status || "Pending",
  };

  const normalizedInitialData = autoFillValues
    ? { ...baseInitialData, ...autoFillValues }
    : baseInitialData;

  const handleAutoFill = async () => {
    setEmployeeError("");
    setPayMonthError("");

    if (!employeeId) {
      setEmployeeError("Select an employee first");
      return;
    }
    const parsed = parsePayMonth(payMonth);
    if (!parsed) {
      setPayMonthError("Enter Pay Month as YYYY-MM first");
      return;
    }

    setFetchingSummary(true);
    try {
      const res = await attendanceApi.monthlySummary({
        employee_id: employeeId,
        month: parsed.month,
        year: parsed.year,
      });
      const items = res?.data?.data?.items || [];
      const summary = items[0];

      if (!summary) {
        showToast("No attendance summary found for this period", "error");
        return;
      }

      setAutoFillValues({
        gross_salary: normalizeAmount(summary.gross_salary),
        deductions: normalizeAmount(summary.absent_deduction),
        net_salary: normalizeAmount(summary.net_salary),
      });

      showToast(
        `Filled from attendance: ${summary.present_days} present, ${summary.absent_days} absent, ${summary.holiday_days ?? 0} holiday(s)`,
        "success"
      );
    } catch (err) {
      showToast(
        err?.response?.data?.message || err?.message || "Failed to fetch attendance summary",
        "error"
      );
    } finally {
      setFetchingSummary(false);
    }
  };

  const handleGenericFormSubmit = async (payload) => {
    setEmployeeError("");
    setPayMonthError("");

    let hasError = false;
    if (!employeeId) {
      setEmployeeError("Employee is required");
      hasError = true;
    }
    if (!payMonth) {
      setPayMonthError("Pay Month is required");
      hasError = true;
    }
    if (hasError) return;

    const normalizedPayload = {
      ...payload,
      employee_id: normalizeId(employeeId),
      pay_month: payMonth,
      gross_salary: normalizeAmount(payload?.gross_salary),
      deductions: normalizeAmount(payload?.deductions),
      net_salary: normalizeAmount(payload?.net_salary),
      status: payload?.status || "Pending",
    };

    await onSubmit(normalizedPayload);
  };

  return (
    <div>
      <div className="mb-4">
        <Select
          label="Employee"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          options={employeeOptions}
          error={employeeError}
          required
          placeholder="Select Employee"
        />
      </div>

      <div className="mb-4 flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Pay Month"
            name="pay_month"
            value={payMonth}
            onChange={(e) => setPayMonth(e.target.value)}
            error={payMonthError}
            required
            placeholder="YYYY-MM"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleAutoFill}
          disabled={fetchingSummary}
          className="h-10 shrink-0 whitespace-nowrap"
        >
          {fetchingSummary ? "Fetching..." : "Auto-fill from Attendance"}
        </Button>
      </div>

      <GenericForm
        formId={formId}
        fields={fields}
        initialData={normalizedInitialData}
        onSubmit={handleGenericFormSubmit}
        loading={loading}
        onCancel={onCancel}
        isEdit={isEdit}
      />
    </div>
  );
}