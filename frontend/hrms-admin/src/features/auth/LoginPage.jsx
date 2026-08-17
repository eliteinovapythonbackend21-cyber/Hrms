import { useState } from "react";
import { useLogin } from "./useAuth";
import { useToast } from "@/components/feedback/Toast";
import { validateLogin } from "./authValidation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const MailIcon = () => (
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
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

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

const AdminIcon = () => (
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

const EmployeeIcon = () => (
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
      d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
    />
    <circle cx="9" cy="7" r="4" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-3.5 w-3.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 12l4 4L19 6"
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

const WarningIcon = () => (
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
      d="M12 9v4m0 4h.01M10.29 3.86l-8.82 15a2 2 0 001.71 3h17.64a2 2 0 001.71-3l-8.82-15a2 2 0 00-3.42 0z"
    />
  </svg>
);

export default function LoginPage() {
  const { showToast } = useToast();
  const login = useLogin();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [remember, setRemember] = useState(true);
  const [loginType, setLoginType] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);

  // Wrong login type popup
  const [loginTypeError, setLoginTypeError] = useState(null);

  const isAdminLogin = loginType === "admin";

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

  const handleLoginTypeChange = (type) => {
    setLoginType(type);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateLogin(form);

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      await login.mutateAsync({
        ...form,
        login_type: loginType,
        remember,
      });
    } catch (err) {
      /*
       * Wrong Admin / Employee login type
       */
      if (err?.code === "WRONG_LOGIN_TYPE") {
        const correctLoginType =
          err?.response?.data?.loginType ||
          (loginType === "admin" ? "employee" : "admin");

        const message =
          err?.response?.data?.message ||
          "You are using the wrong login portal.";

        setLoginTypeError({
          message,
          correctLoginType,
        });

        return;
      }

      /*
       * Normal login error
       */
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Login failed. Please check your credentials.";

      showToast(msg, "error");
    }
  };

  const handleSwitchLogin = () => {
    if (!loginTypeError) return;

    setLoginType(loginTypeError.correctLoginType);
    setLoginTypeError(null);
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <div className="flex min-h-screen">

        {/* =====================================================
            LEFT BRANDING PANEL
        ====================================================== */}
        <div className="relative hidden overflow-hidden lg:flex lg:w-[52%] xl:w-[56%]">
          <div className="absolute inset-0 bg-slate-950" />

          <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-primary-600/30 blur-3xl" />

          <div className="absolute -bottom-40 -right-20 h-[550px] w-[550px] rounded-full bg-blue-500/20 blur-3xl" />

          <div className="absolute inset-0 opacity-[0.07]">
            <div
              className="h-full w-full"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
            />
          </div>

          <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white shadow-lg shadow-primary-600/30">
                <ShieldIcon />
              </div>

              <div>
                <div className="text-lg font-bold tracking-tight text-white">
                  HRMS
                </div>

                <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
                  Human Resource Management
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="max-w-xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/60" />
                Workforce management platform
              </div>

              <h2 className="text-4xl font-bold leading-[1.12] tracking-tight text-white xl:text-5xl">
                Everything your
                <span className="block text-primary-400">
                  workforce needs.
                </span>
              </h2>

              <p className="mt-5 max-w-lg text-sm leading-7 text-slate-400 xl:text-base">
                Manage employees, attendance, payroll, leave, performance
                and everyday HR operations from one secure workspace.
              </p>

              <div className="mt-9 grid grid-cols-2 gap-3">
                {[
                  ["Employee Management", "Centralized workforce data"],
                  ["Attendance & Leave", "Track time effortlessly"],
                  ["Payroll Management", "Accurate payroll workflows"],
                  ["Reports & Insights", "Actionable HR analytics"],
                ].map(([title, description]) => (
                  <div
                    key={title}
                    className="rounded-xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.07]"
                  >
                    <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500/15 text-primary-400">
                      <CheckIcon />
                    </div>

                    <p className="text-xs font-semibold text-white">
                      {title}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-500">
                      {description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-white/10 pt-6">
              <p className="text-xs text-slate-500">
                © {new Date().getFullYear()} HRMS. All rights reserved.
              </p>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldIcon />
                Secure platform
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            RIGHT LOGIN PANEL
        ====================================================== */}
        <div className="flex w-full items-center justify-center bg-slate-50 px-5 py-8 dark:bg-slate-950 sm:px-8 lg:w-[48%] xl:w-[44%]">
          <div className="w-full max-w-[470px]">

            {/* Mobile Logo */}
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
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

            {/* Login Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/20 sm:p-8">

              {/* Header */}
              <div className="mb-7">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary-600 dark:text-primary-400">
                  Welcome back
                </p>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Sign in to your account
                </h1>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Choose your access type and continue securely.
                </p>
              </div>

              {/* =================================================
                  LOGIN TYPE
              ================================================== */}
              <div className="mb-7">
                <div className="mb-2.5 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Access type
                  </label>

                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Required
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">

                  {/* Admin */}
                  <button
                    type="button"
                    onClick={() => handleLoginTypeChange("admin")}
                    className={`group relative overflow-hidden rounded-xl border p-3.5 text-left transition-all duration-200 ${
                      isAdminLogin
                        ? "border-primary-500 bg-primary-50 shadow-sm shadow-primary-500/10 dark:border-primary-500/60 dark:bg-primary-500/10"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    {isAdminLogin && (
                      <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white">
                        <CheckIcon />
                      </span>
                    )}

                    <div
                      className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${
                        isAdminLogin
                          ? "bg-primary-600 text-white"
                          : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                      }`}
                    >
                      <AdminIcon />
                    </div>

                    <p
                      className={`text-sm font-bold ${
                        isAdminLogin
                          ? "text-primary-700 dark:text-primary-300"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      Admin
                    </p>

                    <p className="mt-1 text-[10px] leading-4 text-slate-400 dark:text-slate-500">
                      Full HR management access
                    </p>
                  </button>

                  {/* Employee */}
                  <button
                    type="button"
                    onClick={() => handleLoginTypeChange("employee")}
                    className={`group relative overflow-hidden rounded-xl border p-3.5 text-left transition-all duration-200 ${
                      !isAdminLogin
                        ? "border-primary-500 bg-primary-50 shadow-sm shadow-primary-500/10 dark:border-primary-500/60 dark:bg-primary-500/10"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    {!isAdminLogin && (
                      <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white">
                        <CheckIcon />
                      </span>
                    )}

                    <div
                      className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${
                        !isAdminLogin
                          ? "bg-primary-600 text-white"
                          : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                      }`}
                    >
                      <EmployeeIcon />
                    </div>

                    <p
                      className={`text-sm font-bold ${
                        !isAdminLogin
                          ? "text-primary-700 dark:text-primary-300"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      Employee
                    </p>

                    <p className="mt-1 text-[10px] leading-4 text-slate-400 dark:text-slate-500">
                      Personal employee portal
                    </p>
                  </button>
                </div>

                {/* Current Login Type */}
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-white/[0.03]">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <CheckIcon />
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Signing in as{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {isAdminLogin ? "Administrator" : "Employee"}
                    </span>
                  </p>
                </div>
              </div>

              {/* =================================================
                  FORM
              ================================================== */}
              <form onSubmit={handleSubmit}>
                <div className="space-y-1">
                  <Input
                    label="Email Address"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    error={errors.email}
                    icon={<MailIcon />}
                    required
                  />

                  <Input
                    label="Password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleChange}
                    error={errors.password}
                    icon={<LockIcon />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((prev) => !prev)
                        }
                        tabIndex={-1}
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        className="flex h-5 w-5 items-center justify-center rounded text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-slate-500 dark:hover:text-slate-300"
                      >
                        <span className="relative block h-4 w-4">
                          <span
                            className={`absolute inset-0 transition-all duration-150 ${
                              showPassword
                                ? "scale-75 opacity-0"
                                : "scale-100 opacity-100"
                            }`}
                          >
                            <EyeIcon />
                          </span>

                          <span
                            className={`absolute inset-0 transition-all duration-150 ${
                              showPassword
                                ? "scale-100 opacity-100"
                                : "scale-75 opacity-0"
                            }`}
                          >
                            <EyeOffIcon />
                          </span>
                        </span>
                      </button>
                    }
                    required
                  />
                </div>

                {/* Remember / Forgot */}
                <div className="mt-2 flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) =>
                        setRemember(e.target.checked)
                      }
                      className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-white/20 dark:bg-white/5"
                    />

                    Remember me
                  </label>

                  {isAdminLogin && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="group mt-6 h-12 w-full text-sm font-semibold"
                  isLoading={login.isPending}
                >
                  <span>
                    {isAdminLogin
                      ? "Continue as Admin"
                      : "Continue as Employee"}
                  </span>

                  {!login.isPending && <ArrowIcon />}
                </Button>
              </form>

              {/* Security */}
              <div className="mt-6 border-t border-slate-100 pt-5 dark:border-white/10">
                <div className="flex items-center justify-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <ShieldIcon />
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Secure authentication
                    </p>

                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      Your credentials are protected
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-5 text-center text-[10px] text-slate-400 dark:text-slate-600">
              By signing in, you agree to your organization's
              authentication and security policies.
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================
          WRONG LOGIN TYPE MODAL
      ========================================================== */}
      {loginTypeError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div
            className="w-full max-w-[430px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-type-error-title"
          >
            {/* Top accent */}
            <div className="h-1 w-full bg-amber-500" />

            <div className="p-7 sm:p-8">

              {/* Icon */}
              <div className="mb-5 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-8 ring-amber-50/60 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/5">
                  <WarningIcon />
                </div>
              </div>

              {/* Heading */}
              <div className="text-center">
                <h2
                  id="login-type-error-title"
                  className="text-xl font-bold tracking-tight text-slate-900 dark:text-white"
                >
                  Wrong Login Portal
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {loginTypeError.message}
                </p>
              </div>

              {/* Correct login */}
              <div className="mt-6 rounded-xl border border-primary-100 bg-primary-50 p-4 dark:border-primary-500/20 dark:bg-primary-500/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white">
                    {loginTypeError.correctLoginType === "admin" ? (
                      <AdminIcon />
                    ) : (
                      <EmployeeIcon />
                    )}
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                      Recommended
                    </p>

                    <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-white">
                      {loginTypeError.correctLoginType === "admin"
                        ? "Admin Login"
                        : "Employee Login"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 space-y-2.5">
                <button
                  type="button"
                  onClick={handleSwitchLogin}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 transition-all hover:bg-primary-700 hover:shadow-primary-600/30"
                >
                  {loginTypeError.correctLoginType === "admin" ? (
                    <AdminIcon />
                  ) : (
                    <EmployeeIcon />
                  )}

                  Switch to{" "}
                  {loginTypeError.correctLoginType === "admin"
                    ? "Admin Login"
                    : "Employee Login"}
                </button>

                <button
                  type="button"
                  onClick={() => setLoginTypeError(null)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.06]"
                >
                  Stay on Current Login
                </button>
              </div>

              {/* Security note */}
              <div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                <ShieldIcon />
                Your account credentials remain secure
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}