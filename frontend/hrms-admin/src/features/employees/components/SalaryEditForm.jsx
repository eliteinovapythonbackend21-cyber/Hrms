import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function SalaryEditForm({ initialSalary = "", onSubmit, onReset, loading }) {
  const [salary, setSalary] = useState(initialSalary ?? "");

  const handleSubmit = (e) => {
    e.preventDefault();
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
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
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
