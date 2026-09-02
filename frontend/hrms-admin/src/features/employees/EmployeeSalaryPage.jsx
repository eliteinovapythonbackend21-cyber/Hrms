import {
  useParams,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  useEmployeeSalary,
  useUpdateSalary,
  useResetSalary,
} from "./useEmployeeSalary";

import SalaryEditForm from "./components/SalaryEditForm";

import { useToast } from "@/components/feedback/Toast";
import LoadingSpinner from "@/components/feedback/LoadingSpinner";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";

import { formatCurrency } from "@/utils/formatCurrency";

import { useState } from "react";
import { getUser } from "@/utils/tokenHelpers";
import { use3DTilt, Motion3DStyles } from "@/hooks/use3DMotion";

// Module identity: sky — matches the rest of the Employee module.
const SKY = {
  icon: "bg-sky-600",
  badge:
    "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
};

function StatCard({ tone, label, value, icon }) {
  const { ref, handlers } = use3DTilt({ max: 9, scale: 1.02 });
  const border = tone === "emerald" ? "border-emerald-100 dark:border-emerald-900/30" : "border-slate-200 dark:border-slate-700";
  return (
    <div className="u-tilt-perspective">
      <div
        ref={ref}
        {...handlers}
        className={`u-tilt u-glare relative overflow-hidden rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-900 ${border}`}
      >
        <div className="u-tilt-content flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <p className={`mt-1 text-lg font-semibold ${tone === "emerald" ? "text-emerald-600 dark:text-emerald-400" : "font-mono text-slate-900 dark:text-white"}`}>
              {value}
            </p>
          </div>
          <div className={`u-float-layer flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone === "emerald" ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400"}`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmployeeSalaryPage() {
  const { id } = useParams();

  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const { showToast } =
    useToast();

  const isAdmin =
    getUser()?.role === "admin";

  /*
   * ---------------------------------------------------------
   * BACK NAVIGATION SOURCE
   * ---------------------------------------------------------
   *
   * Admin -> Master -> Employees
   *       -> Salary
   *       -> ?from=master
   *
   * Normal Employees
   *       -> Salary
   *       -> no from parameter
   *
   */

  const from =
    searchParams.get("from");

  const handleBack = () => {
    if (from === "master") {
      navigate("/master/employees");
      return;
    }

    if (from === "crm") {
      navigate("/crm/employees");
      return;
    }

    navigate("/employees");
  };

  const {
    data: salaryData,
    isLoading,
    isError,
  } = useEmployeeSalary(id);

  const updateSalary =
    useUpdateSalary();

  const resetSalary =
    useResetSalary();

  const [
    confirmReset,
    setConfirmReset,
  ] = useState(false);

  const handleUpdate =
    async (value) => {
      try {
        await updateSalary.mutateAsync({
          id,
          payload: {
            salary: value,
          },
        });

        showToast(
          "Salary updated",
          "success"
        );
      } catch (err) {
        showToast(
          err?.response?.data?.message ||
            "Failed to update salary",
          "error"
        );
      }
    };

  const handleReset =
    async () => {
      try {
        await resetSalary.mutateAsync(
          id
        );

        showToast(
          "Salary reset to 0",
          "success"
        );

        setConfirmReset(false);
      } catch (err) {
        showToast(
          err?.response?.data?.message ||
            "Failed to reset salary",
          "error"
        );
      }
    };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (
    isError ||
    !salaryData
  ) {
    return (
      <div className="py-16 text-center text-slate-500 dark:text-slate-400">
        Salary data not found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <Motion3DStyles />

      {/* HEADER */}

      <div className="u-rise flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="u-hover-float">
            <div
              className={`u-float-target flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm shadow-sky-600/30 ${SKY.icon}`}
            >
              <span className="font-bold">
                E
              </span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Employee Salary
            </h1>

            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {
                salaryData.employee_code
              }
            </p>
          </div>
        </div>

        {/* IMPORTANT:
            Do NOT use navigate("/employees") directly here.
        */}

        <Button
          variant="secondary"
          onClick={handleBack}
          className="w-full transition-transform duration-200 hover:-translate-y-0.5 sm:w-auto"
        >
          Back
        </Button>
      </div>

      {/* STAT CARDS */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          tone="sky"
          label="Employee Code"
          value={salaryData.employee_code}
          icon={<span className="text-sm font-bold">E</span>}
        />
        <StatCard
          tone="emerald"
          label="Current Salary"
          value={formatCurrency(salaryData.salary)}
          icon={<span className="h-2.5 w-2.5 rounded-full bg-emerald-500 u-pulse" />}
        />
      </div>

      {/* ADMIN ACTION CARD */}

      <div className="u-rise rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900" style={{ animationDelay: "60ms" }}>
        {isAdmin ? (
          <>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Update Salary
            </h3>

            <SalaryEditForm
              initialSalary={
                salaryData.salary
              }
              onSubmit={handleUpdate}
              onReset={() =>
                setConfirmReset(true)
              }
              loading={
                updateSalary.isPending
              }
            />
          </>
        ) : (
          <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="mt-0.5 h-5 w-5 shrink-0 text-slate-400"
            >
              <circle
                cx="10"
                cy="10"
                r="7.5"
                stroke="currentColor"
                strokeWidth="1.3"
              />

              <path
                d="M10 9v4.5M10 6.5v.01"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Only an admin can update or
              reset salary figures.
            </p>
          </div>
        )}
      </div>

      {/* RESET CONFIRMATION */}

      {isAdmin && (
        <ConfirmDialog
          open={confirmReset}
          onClose={() =>
            setConfirmReset(false)
          }
          onConfirm={
            handleReset
          }
          title="Reset Salary"
          message="Are you sure you want to reset the salary to 0?"
          confirmText="Reset"
          loading={
            resetSalary.isPending
          }
        />
      )}
    </div>
  );
}