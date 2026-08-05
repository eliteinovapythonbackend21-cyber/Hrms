import { useParams, useNavigate } from "react-router-dom";
import { useLeave, useCreateLeave, useUpdateLeave } from "./useLeaves";
import LeaveForm from "./components/LeaveForm";
import { useToast } from "@/components/feedback/Toast";
import LoadingSpinner from "@/components/feedback/LoadingSpinner";
import Button from "@/components/ui/Button";
import { getUser } from "@/utils/tokenHelpers";

export default function LeaveFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEdit = !!id;
  const user = getUser();
  const isAdmin = user?.role === "admin";

  const { data: leave, isLoading: loadingLeave } = useLeave(id);
  const createLeave = useCreateLeave();
  const updateLeave = useUpdateLeave();

  const handleSubmit = async (payload) => {
    try {
      if (isEdit) {
        await updateLeave.mutateAsync({ id, payload });
        showToast("Leave updated", "success");
      } else {
        await createLeave.mutateAsync(payload);
        showToast("Leave request submitted", "success");
      }
      navigate("/leaves");
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  if (isEdit && loadingLeave) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {isEdit ? "Edit Leave" : "Request Leave"}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isEdit ? "Update your leave request" : "Submit a new leave request"}
        </p>
      </div>

      <div className="card p-6">
        <LeaveForm
          initialData={leave || {}}
          onSubmit={handleSubmit}
          loading={createLeave.isPending || updateLeave.isPending}
          isAdmin={isAdmin}
        />
        <div className="mt-4">
          <Button variant="secondary" onClick={() => navigate("/leaves")}>
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}
