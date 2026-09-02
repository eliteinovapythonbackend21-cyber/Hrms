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

import { useToast } from "@/components/feedback/Toast";
import LoadingSpinner from "@/components/feedback/LoadingSpinner";
import Button from "@/components/ui/Button";
import { use3DTilt, Motion3DStyles } from "@/hooks/use3DMotion";

export default function EmployeeFormPage() {
  const { id } =
    useParams();

  const navigate =
    useNavigate();

  const [
    searchParams,
  ] = useSearchParams();

  const { showToast } =
    useToast();

  const isEdit =
    !!id;

  const fromCrm =
    searchParams.get(
      "from"
    ) === "crm";

  const {
    data: employee,
    isLoading:
      loadingEmployee,
  } = useEmployee(id);

  const createEmployee =
    useCreateEmployee();

  const updateEmployee =
    useUpdateEmployee();

  const cardTilt = use3DTilt({ max: 5, scale: 1.008 });

  const handleSubmit =
    async (payload) => {
      try {
        if (isEdit) {
          await updateEmployee.mutateAsync(
            {
              id: Number(id),
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

        navigate(
          fromCrm
            ? "/crm/employees"
            : "/employees"
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
      <Motion3DStyles />

      <div className="u-rise mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isEdit
              ? "Edit Employee"
              : "Add Employee"}
          </h1>

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
          onClick={() => {
            navigate(
              fromCrm
                ? "/crm/employees"
                : "/employees"
            );
          }}
          className="w-full transition-transform duration-200 hover:-translate-y-0.5 sm:w-auto"
        >
          Back
        </Button>
      </div>

      <div className="u-rise u-tilt-perspective" style={{ animationDelay: "70ms" }}>
        <div
          ref={cardTilt.ref}
          {...cardTilt.handlers}
          className="u-tilt card p-6"
        >
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
    </div>
  );
}