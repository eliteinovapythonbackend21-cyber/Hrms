import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { isRequired, isNonNegativeNumber } from "@/utils/validators";

export default function SalaryEditForm({ initialSalary = "", onSubmit, onReset, loading }) {
  const [salary, setSalary] = useState(initialSalary ?? "");
  const [error, setError] = useState("");

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
      <form onSubmit={handleSubmit}>
        <Input
          label="Salary"
          name="salary"
          type="number"
          step="0.01"
          min="0"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
          error={error}
          required
        />
        <Button type="submit" isLoading={loading} className="w-full">
          Update Salary
        </Button>
      </form>
      {onReset && (
        <div className="mt-4">
          <Button variant="danger" onClick={onReset}>
            Reset Salary to 0
          </Button>
        </div>
      )}
    </div>
  );
}
