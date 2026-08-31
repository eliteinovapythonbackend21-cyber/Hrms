import { useParams, useNavigate } from "react-router-dom";

import {
  useLeave,
  useCreateLeave,
  useUpdateLeave,
} from "./useLeaves";

import LeaveForm from "./components/LeaveForm";

import { useToast } from "@/components/feedback/Toast";
import LoadingSpinner from "@/components/feedback/LoadingSpinner";
import Button from "@/components/ui/Button";

import { getUser } from "@/utils/tokenHelpers";

export default function LeaveFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const isEdit = Boolean(id);

  const user = getUser();
  const isAdmin = user?.role === "admin";

  const {
    data: leave,
    isLoading: loadingLeave,
    isError: leaveError,
  } = useLeave(id);

  const createLeave = useCreateLeave();
  const updateLeave = useUpdateLeave();

  const isSubmitting =
    createLeave.isPending || updateLeave.isPending;

  const handleSubmit = async (payload) => {
    try {
      if (isEdit) {
        await updateLeave.mutateAsync({
          id,
          payload,
        });

        showToast(
          "Leave request updated successfully",
          "success"
        );
      } else {
        await createLeave.mutateAsync(payload);

        showToast(
          "Leave request submitted successfully",
          "success"
        );
      }

      navigate("/leaves");
    } catch (error) {
      showToast(
        error.response?.data?.message ||
          "Unable to complete the leave operation",
        "error"
      );
    }
  };

  if (isEdit && loadingLeave) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isEdit && leaveError) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-900/10">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            Unable to load leave request
          </p>

          <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/70">
            The requested leave record could not be loaded.
          </p>

          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => navigate("/leaves")}
          >
            Back to Leaves
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      {/* HEADER */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <path d="M8 2v4M16 2v4M3 10h18" />
                <path d="M12 14v4M10 16h4" />
              </svg>
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {isEdit ? "Edit Leave Request" : "Request Leave"}
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {isEdit
                  ? "Update the leave request details."
                  : "Submit a new employee leave request for approval."}
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={() => navigate("/leaves")}
            className="w-full sm:w-auto"
          >
            Back
          </Button>
        </div>
      </div>

      {/* FORM */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800 sm:p-6">
        <LeaveForm
          initialData={leave || {}}
          onSubmit={handleSubmit}
          loading={isSubmitting}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}