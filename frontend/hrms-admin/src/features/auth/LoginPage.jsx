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

export default function LoginPage() {
  const { showToast } = useToast();
  const login = useLogin();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [remember, setRemember] = useState(true);
  const [loginType, setLoginType] = useState("admin");
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
      subtitle={isAdminLogin ? "Sign in to your HRMS admin account" : "Sign in to your HRMS employee account"}
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
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          icon={<LockIcon />}
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
            <span className="text-sm text-slate-400 dark:text-slate-500" title="Contact an administrator to reset your password">
              Forgot password?
            </span>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          isLoading={login.isPending}
        >
          Sign In
        </Button>
      </form>
    </AuthLayout>
  );
}
