import { useParams, useNavigate } from "react-router-dom";
import { useUser, useCreateUser, useUpdateUser } from "./useUsers";
import UserForm from "./components/UserForm";
import { useToast } from "@/components/feedback/Toast";
import LoadingSpinner from "@/components/feedback/LoadingSpinner";
import Button from "@/components/ui/Button";
import { getUser } from "@/utils/tokenHelpers";

export default function UserFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEdit = !!id;
  const isAdmin = getUser()?.role === "admin";

  const { data: user, isLoading: loadingUser } = useUser(id);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const handleSubmit = async (payload) => {
    try {
      if (isEdit) {
        await updateUser.mutateAsync({ id, payload });
        showToast("User updated", "success");
      } else {
        await createUser.mutateAsync(payload);
        showToast("User created", "success");
      }
      navigate("/users");
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  if (isEdit && loadingUser) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isEdit ? "Edit User" : "Add User"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isEdit ? `Editing user: ${user?.username}` : "Create a new user account"}
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate("/users")} className="w-full sm:w-auto">
          Back
        </Button>
      </div>

      <div className="card p-6">
        <UserForm
          initialData={user || {}}
          onSubmit={handleSubmit}
          loading={createUser.isPending || updateUser.isPending}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
