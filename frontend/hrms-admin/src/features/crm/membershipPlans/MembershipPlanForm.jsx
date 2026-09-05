import { useState } from "react";
import Button from "@/components/ui/Button";

function FieldLabel({ children, required = false }) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

export default function MembershipPlanForm({ initialData = {}, onSubmit, onCancel, loading, isEdit }) {
  const [name, setName] = useState(initialData.name || "");
  const [rate, setRate] = useState(
    initialData.rate !== undefined && initialData.rate !== null ? String(initialData.rate) : ""
  );
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Plan name is required");
      return;
    }

    const rateValue = Number(rate);
    if (!rate || Number.isNaN(rateValue) || rateValue < 0) {
      setError("Rate must be a valid non-negative number");
      return;
    }

    setError("");
    onSubmit({ name: name.trim(), rate: rateValue });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      <div>
        <FieldLabel required>Plan Name</FieldLabel>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Silver, Gold, Diamond"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
        />
      </div>

      <div>
        <FieldLabel required>Rate (₹)</FieldLabel>
        <input
          type="number"
          min="0"
          step="0.01"
          value={rate}
          onChange={(event) => setRate(event.target.value)}
          placeholder="e.g. 1000"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" isLoading={loading}>
          {isEdit ? "Save Changes" : "Add Plan"}
        </Button>
      </div>
    </form>
  );
}
