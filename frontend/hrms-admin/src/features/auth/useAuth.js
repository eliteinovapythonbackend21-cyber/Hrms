import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { authApi } from "@/api/auth.api";
import { useToast } from "@/components/feedback/Toast";

/* ============================================================
   AUTH STORAGE HELPERS
============================================================ */

const TOKEN_KEY = "token";
const USER_KEY = "user";

const saveAuthData = (token, user) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

const clearAuthData = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/* ============================================================
   LOGIN
============================================================ */

export function useLogin() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (credentials) => {
      return await authApi.login(credentials);
    },

    onSuccess: (response) => {
      const token =
        response?.token ||
        response?.access_token ||
        response?.data?.token ||
        response?.data?.access_token;

      const user =
        response?.user ||
        response?.data?.user ||
        null;

      if (!token) {
        showToast?.(
          "Login response did not contain an authentication token.",
          "error"
        );

        return;
      }

      saveAuthData(token, user);

      showToast?.(
        response?.message || "Login successful",
        "success"
      );

      navigate("/dashboard", {
        replace: true,
      });
    },

    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Login failed. Please check your credentials.";

      showToast?.(message, "error");
    },
  });
}

/* ============================================================
   REGISTER
============================================================ */

export function useRegister() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (data) => {
      return await authApi.register(data);
    },

    onSuccess: (response) => {
      const token =
        response?.token ||
        response?.access_token ||
        response?.data?.token ||
        response?.data?.access_token;

      const user =
        response?.user ||
        response?.data?.user ||
        null;

      if (token) {
        saveAuthData(token, user);

        navigate("/dashboard", {
          replace: true,
        });
      }

      showToast?.(
        response?.message || "Registration successful",
        "success"
      );
    },

    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Registration failed.";

      showToast?.(message, "error");
    },
  });
}

/* ============================================================
   FORGOT PASSWORD
============================================================ */

export function useForgotPassword() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (data) => {
      return await authApi.forgotPassword(data);
    },

    onSuccess: (response) => {
      showToast?.(
        response?.message ||
          "An OTP has been sent to your registered email.",
        "success"
      );
    },

    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Unable to send OTP. Please try again.";

      showToast?.(message, "error");
    },
  });
}

/* ============================================================
   VERIFY OTP
============================================================ */

export function useVerifyOtp() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (data) => {
      return await authApi.verifyOtp(data);
    },

    onSuccess: (response, variables) => {
      /*
       * Preserve the email used during OTP verification.
       */
      const email =
        response?.email ||
        response?.data?.email ||
        variables?.email ||
        "";

      if (!email) {
        showToast?.(
          "OTP verified, but the email address could not be determined.",
          "error"
        );

        return;
      }

      /*
       * Store email temporarily.
       */
      sessionStorage.setItem(
        "password_reset_email",
        email
      );

      /*
       * Move to reset password page.
       */
      navigate(
        `/reset-password?email=${encodeURIComponent(email)}`,
        {
          replace: true,
        }
      );

      showToast?.(
        response?.message ||
          "OTP verified successfully. You can now reset your password.",
        "success"
      );
    },

    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Invalid or expired OTP.";

      showToast?.(message, "error");
    },
  });
}

/* ============================================================
   RESET PASSWORD
============================================================ */

export function useResetPassword() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (data) => {
      return await authApi.resetPassword(data);
    },

    onSuccess: (response) => {
      /*
       * Clear temporary password reset data.
       */
      sessionStorage.removeItem(
        "password_reset_email"
      );

      sessionStorage.removeItem(
        "password_reset_token"
      );

      sessionStorage.removeItem(
        "password_reset_otp"
      );

      /*
       * Do not save a JWT here.
       * The user must login again with the new password.
       */
      showToast?.(
        response?.message ||
          "Password reset successfully. Please sign in with your new password.",
        "success"
      );

      navigate("/login", {
        replace: true,
      });
    },

    onError: (error) => {
      /*
       * SAME_PASSWORD is handled by ResetPasswordPage.jsx.
       */
      const responseData =
        error?.response?.data || {};

      if (
        responseData?.code === "SAME_PASSWORD"
      ) {
        return;
      }

      const message =
        responseData?.message ||
        responseData?.error ||
        error?.message ||
        "Unable to reset password. Please try again.";

      showToast?.(message, "error");
    },
  });
}

/* ============================================================
   LOGOUT
============================================================ */

export function useLogout() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async () => {
      if (typeof authApi.logout === "function") {
        return await authApi.logout();
      }

      return true;
    },

    onSuccess: () => {
      clearAuthData();

      showToast?.(
        "Logged out successfully",
        "success"
      );

      navigate("/login", {
        replace: true,
      });
    },

    onError: () => {
      /*
       * Clear local authentication even if
       * backend logout fails.
       */
      clearAuthData();

      navigate("/login", {
        replace: true,
      });
    },
  });
}