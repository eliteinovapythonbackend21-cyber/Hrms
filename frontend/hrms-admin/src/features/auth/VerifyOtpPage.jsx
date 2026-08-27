import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useVerifyOtp, useForgotPassword } from "./useAuth";
import { useToast } from "@/components/feedback/Toast";
import { validateOtp } from "./authValidation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

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

const OtpIcon = () => (
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
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

export default function VerifyOtpPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";

  const verifyOtp = useVerifyOtp();
  const forgotPassword = useForgotPassword();

  const [form, setForm] = useState({ otp: "" });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;

    // OTP field: digits only, capped at 6 characters
    const cleaned = name === "otp" ? value.replace(/\D/g, "").slice(0, 6) : value;

    setForm((prev) => ({ ...prev, [name]: cleaned }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      showToast("Missing email. Please restart the reset process.", "error");
      navigate("/forgot-password");
      return;
    }

    const validationErrors = validateOtp(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      await verifyOtp.mutateAsync({ email, otp: form.otp });
      showToast("OTP verified successfully.", "success");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Invalid or expired OTP. Please try again.";

      showToast(msg, "error");
    }
  };

  const handleResend = async () => {
    if (!email) {
      navigate("/forgot-password");
      return;
    }

    try {
      await forgotPassword.mutateAsync({ email });
      showToast("A new OTP has been sent to your email.", "success");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to resend OTP. Please try again.";

      showToast(msg, "error");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-8 dark:bg-slate-950 sm:px-8">
      <div className="w-full max-w-[470px]">

        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
            <ShieldIcon />
          </div>

          <div>
            <p className="font-bold text-slate-900 dark:text-white">HRMS</p>

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
              <OtpIcon />
            </div>
          </div>

          {/* Header */}
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Verify OTP
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Enter the 6-digit code sent to{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {email || "your email"}
              </span>
              . The code expires in 10 minutes.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <Input
              label="One-Time Password"
              name="otp"
              type="text"
              inputMode="numeric"
              placeholder="000000"
              value={form.otp}
              onChange={handleChange}
              error={errors.otp}
              maxLength={6}
              required
              className="text-center tracking-[0.5em]"
            />

            <Button
              type="submit"
              className="group mt-6 h-12 w-full text-sm font-semibold"
              isLoading={verifyOtp.isPending}
            >
              <span>Verify OTP</span>
              {!verifyOtp.isPending && <ArrowIcon />}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={forgotPassword.isPending}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-50 dark:text-primary-400 dark:hover:text-primary-300"
            >
              {forgotPassword.isPending ? "Resending..." : "Didn't get the code? Resend OTP"}
            </button>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5 dark:border-white/10">
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <BackArrowIcon />
              Use a different email
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-[10px] text-slate-400 dark:text-slate-600">
          By continuing, you agree to your organization's authentication
          and security policies.
        </p>
      </div>
    </div>
  );
}