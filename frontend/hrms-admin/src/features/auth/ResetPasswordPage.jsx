import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useResetPassword } from "./useAuth";
import { useToast } from "@/components/feedback/Toast";
import { validateResetPassword } from "./authValidation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const LockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v4h8z"
    />
  </svg>
);

const EyeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.774 3.162 10.066 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
    />
  </svg>
);

const ShieldIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3l7 4v5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V7l7-4z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.5 12l1.7 1.7 3.8-4"
    />
  </svg>
);

const ArrowIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 12h14m-6-6l6 6-6 6"
    />
  </svg>
);

const BackArrowIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19l-7-7 7-7"
    />
  </svg>
);

const KeyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-7 w-7"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 7a2 2 0 012 2m4 0a6 6 0 11-12 0 6 6 0 0112 0zM9 15l-6 6m0 0h4m-4 0v-4"
    />
  </svg>
);

const AlertIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v4m0 4h.01M10.29 3.86l-7.36 12.75A2 2 0 004.67 19.6h14.66a2 2 0 001.73-2.99L13.7 3.86a2 2 0 00-3.41 0z"
    />
  </svg>
);

function PasswordToggle({ visible, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      aria-label={visible ? "Hide password" : "Show password"}
      className="flex h-5 w-5 items-center justify-center rounded text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-slate-500 dark:hover:text-slate-300"
    >
      <span className="relative block h-4 w-4">
        <span
          className={`absolute inset-0 transition-all duration-150 ${
            visible ? "scale-75 opacity-0" : "scale-100 opacity-100"
          }`}
        >
          <EyeIcon />
        </span>

        <span
          className={`absolute inset-0 transition-all duration-150 ${
            visible ? "scale-100 opacity-100" : "scale-75 opacity-0"
          }`}
        >
          <EyeOffIcon />
        </span>
      </span>
    </button>
  );
}

export default function ResetPasswordPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";

  const resetPassword = useResetPassword();

  const [form, setForm] = useState({
    new_password: "",
    confirm_password: "",
  });

  const [errors, setErrors] = useState({});
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSamePasswordPopup, setShowSamePasswordPopup] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      showToast(
        "Missing email. Please restart the reset process.",
        "error"
      );

      navigate("/forgot-password");
      return;
    }

    const validationErrors = validateResetPassword(form);

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    // Close any previous warning before starting a new request.
    setShowSamePasswordPopup(false);

    try {
      await resetPassword.mutateAsync({
        email,
        ...form,
      });

      showToast(
        "Password reset successfully. Please sign in.",
        "success"
      );
    } catch (err) {
      const responseData = err?.response?.data;
      const errorCode =
        responseData?.code ||
        err?.code ||
        "";

      // Backend response:
      // {
      //   code: "SAME_PASSWORD",
      //   message: "You cannot use your previous password..."
      // }
      if (errorCode === "SAME_PASSWORD") {
        setShowSamePasswordPopup(true);
        setErrors((prev) => ({
          ...prev,
          new_password: responseData?.message || "",
        }));
        return;
      }

      const msg =
        responseData?.message ||
        err?.message ||
        "Failed to reset password. Please try again.";

      showToast(msg, "error");
    }
  };

  const handleSamePasswordPopupClose = () => {
    setShowSamePasswordPopup(false);

    setForm((prev) => ({
      ...prev,
      new_password: "",
      confirm_password: "",
    }));

    setErrors((prev) => ({
      ...prev,
      new_password: "",
      confirm_password: "",
    }));
  };

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-8 dark:bg-slate-950 sm:px-8">
        <div className="w-full max-w-[470px]">

          {/* Logo */}
          <div className="mb-8 flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
              <ShieldIcon />
            </div>

            <div>
              <p className="font-bold text-slate-900 dark:text-white">
                HRMS
              </p>

              <p className="text-[9px] uppercase tracking-wider text-slate-400">
                Human Resource Management
              </p>
            </div>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/20 sm:p-8">

            {/* Icon */}
            <div className="mb-5 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 ring-8 ring-primary-50/60 dark:bg-primary-500/10 dark:text-primary-400 dark:ring-primary-500/5">
                <KeyIcon />
              </div>
            </div>

            {/* Header */}
            <div className="mb-7 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Reset Password
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Choose a new password for{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {email || "your account"}
                </span>
                .
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-1">
                <Input
                  label="New Password"
                  name="new_password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={form.new_password}
                  onChange={handleChange}
                  error={errors.new_password}
                  icon={<LockIcon />}
                  rightIcon={
                    <PasswordToggle
                      visible={showNewPassword}
                      onToggle={() =>
                        setShowNewPassword((prev) => !prev)
                      }
                    />
                  }
                  required
                />

                <Input
                  label="Confirm Password"
                  name="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={form.confirm_password}
                  onChange={handleChange}
                  error={errors.confirm_password}
                  icon={<LockIcon />}
                  rightIcon={
                    <PasswordToggle
                      visible={showConfirmPassword}
                      onToggle={() =>
                        setShowConfirmPassword((prev) => !prev)
                      }
                    />
                  }
                  required
                />
              </div>

              <Button
                type="submit"
                className="group mt-6 h-12 w-full text-sm font-semibold"
                isLoading={resetPassword.isPending}
              >
                <span>Reset Password</span>
                {!resetPassword.isPending && <ArrowIcon />}
              </Button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-white/10">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                <BackArrowIcon />
                Back to Sign In
              </button>
            </div>
          </div>

          <p className="mt-5 text-center text-[10px] text-slate-400 dark:text-slate-600">
            By continuing, you agree to your organization's authentication
            and security policies.
          </p>
        </div>
      </div>

      {/* ============================================================
          SAME PASSWORD POPUP
      ============================================================ */}
      {showSamePasswordPopup && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="same-password-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              handleSamePasswordPopupClose();
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-start gap-4 border-b border-slate-100 px-6 py-5 dark:border-white/10">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                <AlertIcon />
              </div>

              <div className="min-w-0">
                <h2
                  id="same-password-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  Previous Password Cannot Be Reused
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Please create a password that is different from your
                  previous password.
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
                <p className="text-sm leading-6 text-amber-800 dark:text-amber-200">
                  For security reasons, your previous password cannot be
                  used again. Enter a new password and confirm it below.
                </p>
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <p>• Use a password different from your previous one.</p>
                <p>• Make sure both password fields match.</p>
                <p>• Your password must contain at least 6 characters.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-white/10">
              <button
                type="button"
                onClick={handleSamePasswordPopupClose}
                className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              >
                Choose New Password
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
