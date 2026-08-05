import { useParams, useNavigate } from "react-router-dom";
import { useEmployeeSalary, useUpdateSalary, useResetSalary } from "./useEmployeeSalary";
import SalaryEditForm from "./components/SalaryEditForm";
import { useToast } from "@/components/feedback/Toast";
import LoadingSpinner from "@/components/feedback/LoadingSpinner";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import { formatCurrency } from "@/utils/formatCurrency";
import { useState } from "react";
import { getUser } from "@/utils/tokenHelpers";

export default function EmployeeSalaryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isAdmin = getUser()?.role === "admin";
  const { data: salaryData, isLoading, isError } = useEmployeeSalary(id);
  const updateSalary = useUpdateSalary();
  const resetSalary = useResetSalary();
  const [confirmReset, setConfirmReset] = useState(false);

  const handleUpdate = async (value) => {
    try {
      await updateSalary.mutateAsync({ id, payload: { salary: value } });
      showToast("Salary updated", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update salary", "error");
    }
  };

  const handleReset = async () => {
    try {
      await resetSalary.mutateAsync(id);
      showToast("Salary reset to 0", "success");
      setConfirmReset(false);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to reset salary", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !salaryData) {
    return (
      <div className="text-center py-16 text-slate-500 dark:text-slate-400">
        Salary data not found.
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Employee Salary
        </h1>
        <Button variant="secondary" onClick={() => navigate("/employees")} className="w-full sm:w-auto">
          Back
        </Button>
      </div>

      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Employee Code</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {salaryData.employee_code}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Current Salary</p>
            <p className="text-lg font-semibold text-primary-600 dark:text-primary-400">
              {formatCurrency(salaryData.salary)}
            </p>
          </div>
        </div>

        {isAdmin ? (
          <SalaryEditForm
            initialSalary={salaryData.salary}
            onSubmit={handleUpdate}
            onReset={() => setConfirmReset(true)}
            loading={updateSalary.isPending}
          />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Only an admin can update or reset salary figures.
          </p>
        )}
      </div>

      {isAdmin && (
        <ConfirmDialog
          open={confirmReset}
          onClose={() => setConfirmReset(false)}
          onConfirm={handleReset}
          title="Reset Salary"
          message="Are you sure you want to reset the salary to 0?"
          confirmText="Reset"
          loading={resetSalary.isPending}
        />
      )}
    </div>
  );
}
