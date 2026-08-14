import { useState } from "react";
import { useLogin } from "./useAuth";
import { useToast } from "@/components/feedback/Toast";
import { validateLogin } from "./authValidation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AuthLayout from "@/layout/AuthLayout";
import LoginTypeSelect from "./LoginTypeSelect";

const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v4h8z" />
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.774 3.162 10.066 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

export default function LoginPage() {
  const { showToast } = useToast();
  const login = useLogin();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [remember, setRemember] = useState(true);
  const [loginType, setLoginType] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const isAdminLogin = loginType === "admin";

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateLogin(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      await login.mutateAsync(form);
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed";
      showToast(msg, "error");
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={
        <span className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Sign in to your HRMS{" "}
          <span className="text-primary-600 dark:text-primary-400">
            {isAdminLogin ? "Admin Account" : "Employee Account"}
          </span>
        </span>
      }
      topRight={<LoginTypeSelect value={loginType} onChange={setLoginType} />}
    >
      <form onSubmit={handleSubmit}>
        <Input
          label="Email"
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
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          icon={<LockIcon />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="flex h-5 w-5 items-center justify-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
            >
              <span className="relative block h-4 w-4">
                <span
                  className={`absolute inset-0 transition-all duration-150 ${
                    showPassword ? "opacity-0 scale-75" : "opacity-100 scale-100"
                  }`}
                >
                  <EyeIcon />
                </span>
                <span
                  className={`absolute inset-0 transition-all duration-150 ${
                    showPassword ? "opacity-100 scale-100" : "opacity-0 scale-75"
                  }`}
                >
                  <EyeOffIcon />
                </span>
              </span>
            </button>
          }
          required
        />

        <div className="flex items-center justify-between mb-6 -mt-1">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 dark:border-white/20 text-primary-600 focus:ring-primary-500 dark:bg-white/5"
            />
            Remember me
          </label>
          {isAdminLogin && (
            <span
              className="text-sm text-slate-400 dark:text-slate-500"
              title="Contact an administrator to reset your password"
            >
              Forgot password?
            </span>
          )}
        </div>

        <Button type="submit" className="w-full" isLoading={login.isPending}>
          Sign In
        </Button>
      </form>
    </AuthLayout>
  );
}