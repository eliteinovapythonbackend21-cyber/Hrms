import { useState } from "react";
import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";

export default function ReportFilterBar({ onGenerate, loading, label }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onGenerate({
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <DatePicker label="From Date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} required />
        <DatePicker label="To Date" value={toDate} onChange={(e) => setToDate(e.target.value)} required />
      </div>
      <Button type="submit" isLoading={loading} className="w-full">
        {label || "Generate Report"}
      </Button>
    </form>
  );
}
