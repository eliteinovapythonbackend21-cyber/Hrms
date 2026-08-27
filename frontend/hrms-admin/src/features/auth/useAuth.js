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
    localStorage.setItem(
      USER_KEY,
      JSON.stringify(user)
    );
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
      const responseData =
        response?.data && typeof response.data === "object"
          ? response.data
          : response;

      const token =
        response?.token ||
        response?.access_token ||
        responseData?.token ||
        responseData?.access_token;

      const user =
        response?.user ||
        responseData?.user ||
        null;

      if (!token) {
        showToast?.(
          "Login failed: authentication token was not returned by the server.",
          "error"
        );
        return;
      }

      saveAuthData(token, user);

      showToast?.(
        response?.message ||
          responseData?.message ||
          "Login successful",
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
      const responseData =
        response?.data && typeof response.data === "object"
          ? response.data
          : response;

      const token =
        response?.token ||
        response?.access_token ||
        responseData?.token ||
        responseData?.access_token;

      const user =
        response?.user ||
        responseData?.user ||
        null;

      if (token) {
        saveAuthData(token, user);

        navigate("/dashboard", {
          replace: true,
        });
      }

      showToast?.(
        response?.message ||
          responseData?.message ||
          "Registration successful",
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
  return useMutation({
    mutationFn: async (data) => {
      return await authApi.forgotPassword(data);
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
      const responseData =
        response?.data && typeof response.data === "object"
          ? response.data
          : response;

      const email =
        response?.email ||
        responseData?.email ||
        variables?.email ||
        sessionStorage.getItem(
          "password_reset_email"
        ) ||
        "";

      if (!email) {
        showToast?.(
          "OTP verified, but the email address was not found.",
          "error"
        );
        return;
      }

      const normalizedEmail =
        email.trim().toLowerCase();

      sessionStorage.setItem(
        "password_reset_email",
        normalizedEmail
      );

      /*
       * Move to Reset Password.
       *
       * Email is included in URL because
       * ResetPasswordPage reads searchParams.
       */
      navigate(
        `/reset-password?email=${encodeURIComponent(
          normalizedEmail
        )}`,
        {
          replace: true,
        }
      );

      showToast?.(
        response?.message ||
          responseData?.message ||
          "OTP verified successfully.",
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
      const responseData =
        response?.data && typeof response.data === "object"
          ? response.data
          : response;

      /*
       * Clear all password reset information.
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

      showToast?.(
        response?.message ||
          responseData?.message ||
          "Password reset successfully. Please sign in with your new password.",
        "success"
      );

      /*
       * IMPORTANT:
       * Never automatically login after resetting password.
       */
      navigate("/login", {
        replace: true,
      });
    },

    onError: (error) => {
      /*
       * ResetPasswordPage handles SAME_PASSWORD
       * itself and displays its popup.
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
      if (
        typeof authApi.logout === "function"
      ) {
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
      clearAuthData();

      navigate("/login", {
        replace: true,
      });
    },
  });
}