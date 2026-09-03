import {
  useParams,
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  useUser,
  useCreateUser,
  useUpdateUser,
} from "./useUsers";

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

  const location = useLocation();

  const { showToast } = useToast();

  /*
   * Edit mode
   *
   * /users/:id/edit
   */
  const isEdit = !!id;

  /*
   * Logged-in user
   *
   * Used to determine whether the logged-in user
   * is an admin and therefore can access admin fields.
   */
  const currentUser = getUser();

  const isAdmin = currentUser?.role === "admin";

  /*
   * Role passed from UserListPage.
   *
   * Admin list:
   * /users/admins
   * state = { role: "admin" }
   *
   * Employee list:
   * /users/employees
   * state = { role: "employee" }
   */
  const previousRole = location.state?.role;

  /*
   * Get the user when editing.
   */
  const {
    data: user,
    isLoading: loadingUser,
    isError: userError,
  } = useUser(id);

  /*
   * Create user mutation.
   */
  const createUser = useCreateUser();

  /*
   * Update user mutation.
   */
  const updateUser = useUpdateUser();

  /*
   * Decide which list page should be opened
   * when the Back button is clicked.
   *
   * Priority:
   *
   * 1. Role passed from UserListPage
   * 2. Existing user's role
   * 3. Admin as final fallback
   */
  const getBackPath = () => {
    /*
     * Coming from Admin list
     */
    if (previousRole === "admin") {
      return "/users/admins";
    }

    /*
     * Coming from Employee list
     */
    if (previousRole === "employee") {
      return "/users/employees";
    }

    /*
     * If editing and navigation state is unavailable,
     * use the actual user's role.
     */
    if (user?.role === "admin") {
      return "/users/admins";
    }

    if (user?.role === "employee") {
      return "/users/employees";
    }

    /*
     * Final fallback.
     */
    return "/users/admins";
  };

  /*
   * Back button handler.
   *
   * We intentionally do NOT use navigate(-1)
   * because browser history may return to the wrong
   * user list.
   */
  const handleBack = () => {
    navigate(getBackPath());
  };

  /*
   * Submit handler.
   */
  const handleSubmit = async (payload) => {
    try {
      /*
       * =========================
       * EDIT USER
       * =========================
       */
      if (isEdit) {
        await updateUser.mutateAsync({
          id,
          payload,
        });

        showToast("User updated", "success");

        /*
         * Return to the same list from which
         * the user was opened.
         */
        if (previousRole === "admin") {
          navigate("/users/admins");
          return;
        }

        if (previousRole === "employee") {
          navigate("/users/employees");
          return;
        }

        /*
         * If state was lost, use the user's actual role.
         */
        if (user?.role === "admin") {
          navigate("/users/admins");
          return;
        }

        navigate("/users/employees");

        return;
      }

      /*
       * =========================
       * CREATE USER
       * =========================
       */
      const response = await createUser.mutateAsync(payload);

      /*
       * Get the role returned by the backend first.
       *
       * Fallback:
       * payload.role
       *
       * Final fallback:
       * previousRole
       */
      const createdRole =
        response?.data?.data?.role ||
        response?.data?.role ||
        payload?.role ||
        previousRole;

      showToast("User created", "success");

      /*
       * Return to the correct list.
       */
      if (createdRole === "admin") {
        navigate("/users/admins");
      } else {
        navigate("/users/employees");
      }
    } catch (err) {
      console.error("User save error:", err);

      showToast(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Operation failed",
        "error"
      );
    }
  };

  /*
   * Show loading while fetching an existing user
   * for Edit mode.
   */
  if (isEdit && loadingUser) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  /*
   * Show error if the existing user could not be loaded.
   */
  if (isEdit && userError) {
    return (
      <div className="mx-auto max-w-lg py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <h2 className="font-semibold">
            Failed to load user
          </h2>

          <p className="mt-1 text-sm">
            The requested user could not be loaded.
          </p>

          <Button
            type="button"
            variant="secondary"
            onClick={handleBack}
            className="mt-4"
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  /*
   * Initial data for UserForm.
   *
   * When creating:
   *
   * Admin -> role = admin
   * Employee -> role = employee
   *
   * When editing:
   * use the existing user's data.
   */
  const initialData = {
    ...(user || {}),

    /*
     * Only apply previousRole while creating.
     *
     * Do not overwrite the actual role of an
     * existing user during edit.
     */
    ...(previousRole && !isEdit
      ? {
          role: previousRole,
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-lg space-y-5">
      {/* =========================
          HEADER
          ========================= */}
      <div className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-indigo-50/40 to-white p-4 shadow-sm dark:border-white/[0.08] dark:from-indigo-500/[0.08] dark:via-white/[0.02] dark:to-transparent sm:flex-row sm:items-center sm:justify-between">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl" />

        <div className="relative flex items-center gap-3">
          {/* Icon */}
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/20 ${INDIGO.icon}`}
          >
            <span className="font-bold">
              U
            </span>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isEdit
                ? "Edit User"
                : "Add User"}
            </h1>

            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {isEdit
                ? `Editing user: ${
                    user?.username || ""
                  }`
                : previousRole === "admin"
                ? "Create a new admin account"
                : previousRole === "employee"
                ? "Create a new employee account"
                : "Create a new user account"}
            </p>
          </div>
        </div>

        {/* Back Button */}
        <div className="relative inline-block w-full sm:w-auto">
          <Button
            type="button"
            variant="secondary"
            onClick={handleBack}
            className="w-full transition-shadow duration-200 hover:shadow-md sm:w-auto"
          >
            Back
          </Button>
        </div>
      </div>

      {/* =========================
          FORM CARD
          ========================= */}
      <div>
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <UserForm
            initialData={initialData}
            onSubmit={handleSubmit}
            loading={
              createUser.isPending ||
              updateUser.isPending
            }
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </div>
  );
}
