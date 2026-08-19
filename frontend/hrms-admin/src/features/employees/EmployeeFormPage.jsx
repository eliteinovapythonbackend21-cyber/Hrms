import {
  useParams,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  useEmployee,
  useCreateEmployee,
  useUpdateEmployee,
} from "./useEmployees";

import EmployeeForm from "./components/EmployeeForm";

import {
  useToast,
} from "@/components/feedback/Toast";

import LoadingSpinner from "@/components/feedback/LoadingSpinner";
import Button from "@/components/ui/Button";

export default function EmployeeFormPage() {
  const { id } =
    useParams();

  const navigate =
    useNavigate();

  const [searchParams] =
    useSearchParams();

  const { showToast } =
    useToast();

  const isEdit = !!id;

  /*
   * CRM opens:
   *
   * /employees/:id/edit?returnTo=/crm/employees
   *
   * Normal employee editing has
   * no returnTo parameter.
   */
  const returnTo =
    searchParams.get(
      "returnTo"
    ) || "";

  const isCrm =
    returnTo ===
    "/crm/employees";

  const backPath =
    returnTo ||
    "/employees";

  const {
    data: employee,
    isLoading:
      loadingEmployee,
  } = useEmployee(id);

  const createEmployee =
    useCreateEmployee();

  const updateEmployee =
    useUpdateEmployee();

  const handleSubmit =
    async (payload) => {
      try {
        if (isEdit) {
          await updateEmployee.mutateAsync(
            {
              id,
              payload,
            }
          );

          showToast(
            "Employee updated",
            "success"
          );
        } else {
          await createEmployee.mutateAsync(
            payload
          );

          showToast(
            "Employee created",
            "success"
          );
        }

        /*
         * Return to the page from which
         * the user opened the form.
         *
         * CRM -> /crm/employees
         * Normal -> /employees
         */
        navigate(
          backPath,
          {
            replace: true,
          }
        );
      } catch (err) {
        showToast(
          err?.response?.data
            ?.message ||
            "Operation failed",
          "error"
        );
      }
    };

  if (
    isEdit &&
    loadingEmployee
  ) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isEdit
                ? "Edit Employee"
                : "Add Employee"}
            </h1>

            {isCrm && (
              <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-semibold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                CRM
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isEdit
              ? `Editing: ${
                  employee?.first_name ||
                  ""
                } ${
                  employee?.last_name ||
                  ""
                }`
              : "Create a new employee record"}
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() =>
            navigate(
              backPath
            )
          }
          className="w-full sm:w-auto"
        >
          Back
        </Button>
      </div>

      <div className="card p-6">
        <EmployeeForm
          initialData={
            employee || {}
          }
          onSubmit={
            handleSubmit
          }
          loading={
            createEmployee.isPending ||
            updateEmployee.isPending
          }
        />
      </div>
    </div>
  );
}