import { useParams, useNavigate } from "react-router-dom";
import { useEmployee, useCreateEmployee, useUpdateEmployee } from "./useEmployees";
import EmployeeForm from "./components/EmployeeForm";
import { useToast } from "@/components/feedback/Toast";
import LoadingSpinner from "@/components/feedback/LoadingSpinner";
import Button from "@/components/ui/Button";

export default function EmployeeFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEdit = !!id;

  const { data: employee, isLoading: loadingEmployee } = useEmployee(id);
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  const handleSubmit = async (payload) => {
    try {
      if (isEdit) {
        await updateEmployee.mutateAsync({ id, payload });
        showToast("Employee updated", "success");
      } else {
        await createEmployee.mutateAsync(payload);
        showToast("Employee created", "success");
      }
      navigate("/employees");
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  if (isEdit && loadingEmployee) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {isEdit ? "Edit Employee" : "Add Employee"}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isEdit ? `Editing: ${employee?.first_name} ${employee?.last_name}` : "Create a new employee record"}
        </p>
      </div>

      <div className="card p-6">
        <EmployeeForm
          initialData={employee || {}}
          onSubmit={handleSubmit}
          loading={createEmployee.isPending || updateEmployee.isPending}
        />
        <div className="mt-4">
          <Button variant="secondary" onClick={() => navigate("/employees")}>
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}
