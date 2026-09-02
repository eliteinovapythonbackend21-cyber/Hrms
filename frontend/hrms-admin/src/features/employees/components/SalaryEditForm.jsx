import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { isRequired, isNonNegativeNumber } from "@/utils/validators";
import { useMagnetic, Motion3DStyles } from "@/hooks/use3DMotion";

const RupeeIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
    <path d="M6 5h8M6 8h8M6 5c3 0 5 1 5 3s-2 3-5 3M6 11l6 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function SalaryEditForm({ initialSalary = "", onSubmit, onReset, loading }) {
  const [salary, setSalary] = useState(initialSalary ?? "");
  const [error, setError] = useState("");
  const submitMagnet = useMagnetic(0.2);

  const isUnchanged = Number(salary) === Number(initialSalary ?? 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isRequired(salary)) {
      setError("Salary is required");
      return;
    }
    if (Number.isNaN(Number(salary)) || !isNonNegativeNumber(salary)) {
      setError("Salary must be a non-negative number");
      return;
    }
    setError("");
    onSubmit(Number(salary));
  };

  return (
    <div>
      <Motion3DStyles />
      <form onSubmit={handleSubmit} className="u-rise">
        <Input
          label="Salary"
          name="salary"
          type="number"
          step="0.01"
          min="0"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
          error={error}
          icon={<RupeeIcon />}
          required
        />
        <div ref={submitMagnet.ref} {...submitMagnet.handlers} className="w-full will-change-transform">
          <Button
            type="submit"
            isLoading={loading}
            disabled={isUnchanged}
            className="w-full shadow-sm transition-shadow duration-200 hover:shadow-lg"
          >
            Update Salary
          </Button>
        </div>
      </form>

      {onReset && (
        <div className="u-rise mt-4 border-t border-slate-100 pt-4 dark:border-slate-800" style={{ animationDelay: "60ms" }}>
          <p className="mb-2 text-xs text-slate-400">
            Resetting sets this employee's salary to ₹0 — use with care.
          </p>
          <Button variant="danger" onClick={onReset} className="w-full transition-transform duration-200 hover:-translate-y-0.5 sm:w-auto">
            Reset Salary to 0
          </Button>
        </div>
      )}
    </div>
  );
}