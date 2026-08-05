import { useState } from "react";
import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import Input from "@/components/ui/Input";

export default function ReportFilterBar({ onGenerate, loading, label }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onGenerate({
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      employee_id: employeeId || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
      <DatePicker label="From Date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
      <DatePicker label="To Date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
      <Input
        label="Employee ID"
        type="number"
        value={employeeId}
        onChange={(e) => setEmployeeId(e.target.value)}
        placeholder="Optional"
      />
      <div>
        <Button type="submit" isLoading={loading} className="w-full">
          {label || "Generate Report"}
        </Button>
      </div>
    </form>
  );
}
