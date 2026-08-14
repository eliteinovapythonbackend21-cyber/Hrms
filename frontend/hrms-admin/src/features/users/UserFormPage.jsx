import { useParams, useNavigate } from "react-router-dom";
import { useUser, useCreateUser, useUpdateUser } from "./useUsers";
import UserForm from "./components/UserForm";
import { useToast } from "@/components/feedback/Toast";
import LoadingSpinner from "@/components/feedback/LoadingSpinner";
import Button from "@/components/ui/Button";
import { getUser } from "@/utils/tokenHelpers";

// Module identity: indigo — matches UserProfilePage.
const INDIGO = {
  icon: "bg-indigo-600",
};

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
      let createdRole = payload.role;
      if (isEdit) {
        await updateUser.mutateAsync({ id, payload });
        showToast("User updated", "success");
      } else {
        const res = await createUser.mutateAsync(payload);
        createdRole = res?.data?.data?.role || payload.role;
        showToast("User created", "success");
      }
      // Land back on the list that actually contains the record just
      // created/edited, instead of a hardcoded "/users" (which always
      // redirects to /users/employees regardless of the account's role).
      navigate(createdRole === "admin" ? "/users/admins" : "/users/employees");
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
    <div className="mx-auto max-w-lg space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm ${INDIGO.icon}`}>
            <span className="font-bold">U</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isEdit ? "Edit User" : "Add User"}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {isEdit ? `Editing user: ${user?.username}` : "Create a new user account"}
            </p>
          </div>
        </div>

        <Button variant="secondary" onClick={() => navigate(-1)} className="w-full sm:w-auto">
          Back
        </Button>
      </div>

      {/* FORM CARD */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
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