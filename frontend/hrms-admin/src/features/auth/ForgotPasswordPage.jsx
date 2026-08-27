import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useForgotPassword } from "./useAuth";
import { useToast } from "@/components/feedback/Toast";
import { validateForgotPassword } from "./authValidation";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

/* ============================================================
   ICONS
============================================================ */

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

/* ============================================================
   PAGE
============================================================ */

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const forgotPassword = useForgotPassword();

  const [form, setForm] = useState({
    email: "",
  });

  const [errors, setErrors] = useState({});

  /* ==========================================================
     INPUT CHANGE
  ========================================================== */

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

  /* ==========================================================
     SUBMIT
  ========================================================== */

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedEmail = form.email
      .trim()
      .toLowerCase();

    /*
     * Validate email.
     */
    const validationErrors =
      validateForgotPassword({
        email: normalizedEmail,
      });

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      /*
       * Send OTP to backend.
       */
      await forgotPassword.mutateAsync({
        email: normalizedEmail,
      });

      /*
       * Keep the email in session storage.
       */
      sessionStorage.setItem(
        "password_reset_email",
        normalizedEmail
      );

      /*
       * Show success message.
       */
      showToast(
        "An OTP has been sent to your email.",
        "success"
      );

      /*
       * IMPORTANT:
       * Navigate to OTP verification page.
       */
      navigate(
        `/verify-otp?email=${encodeURIComponent(
          normalizedEmail
        )}`,
        {
          replace: true,
        }
      );
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to send OTP. Please try again.";

      showToast(msg, "error");
    }
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-8 dark:bg-slate-950 sm:px-8">
      <div className="w-full max-w-[470px]">

        {/* ====================================================
            LOGO
        ==================================================== */}

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

        {/* ====================================================
            CARD
        ==================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/20 sm:p-8">

          {/* ==================================================
              ICON
          ================================================== */}

          <div className="mb-5 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 ring-8 ring-primary-50/60 dark:bg-primary-500/10 dark:text-primary-400 dark:ring-primary-500/5">
              <KeyIcon />
            </div>
          </div>

          {/* ==================================================
              HEADER
          ================================================== */}

          <div className="mb-7 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Forgot Password?
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Enter the email address linked to your account.
              We'll send a one-time code to verify it's you.
            </p>
          </div>

          {/* ==================================================
              FORM
          ================================================== */}

          <form onSubmit={handleSubmit}>
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

            <Button
              type="submit"
              className="group mt-6 h-12 w-full text-sm font-semibold"
              isLoading={forgotPassword.isPending}
            >
              <span>
                {forgotPassword.isPending
                  ? "Sending OTP..."
                  : "Send OTP"}
              </span>

              {!forgotPassword.isPending && (
                <ArrowIcon />
              )}
            </Button>
          </form>

          {/* ==================================================
              BACK TO LOGIN
          ================================================== */}

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

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <p className="mt-5 text-center text-[10px] text-slate-400 dark:text-slate-600">
          By continuing, you agree to your organization's
          authentication and security policies.
        </p>
      </div>
    </div>
  );
}