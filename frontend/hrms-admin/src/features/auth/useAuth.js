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
       * Always preserve the email used for OTP verification.
       *
       * The backend may also return email, but variables.email
       * is the most reliable source.
       */
      const email =
        response?.email ||
        response?.data?.email ||
        variables?.email ||
        "";

      if (!email) {
        showToast?.(
          "OTP verified, but the account email could not be determined.",
          "error"
        );

        return;
      }

      /*
       * Keep the email temporarily.
       */
      sessionStorage.setItem(
        "password_reset_email",
        email
      );

      /*
       * OTP verification is now complete.
       *
       * IMPORTANT:
       * The reset page expects email from the query string.
       */
      navigate(
        `/reset-password?email=${encodeURIComponent(email)}`,
        {
          replace: true,
        }
      );

      showToast?.(
        response?.message ||
          "OTP verified successfully. You can now create a new password.",
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
       * Clear all temporary reset data.
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
       * Do NOT save JWT.
       * Do NOT save user.
       * Do NOT redirect to dashboard.
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
      const responseData =
        error?.response?.data || {};

      const errorCode =
        responseData?.code ||
        error?.code ||
        "";

      /*
       * Previous password reuse.
       */
      if (errorCode === "SAME_PASSWORD") {
        /*
         * Let ResetPasswordPage handle the popup.
         * Re-throw the error because mutateAsync() needs
         * to enter the component catch block.
         */
        throw error;
      }

      const message =
        responseData?.message ||
        error?.message ||
        "Unable to reset password. Please try again.";

      showToast?.(message, "error");

      /*
       * Keep the mutation rejected.
       */
      throw error;
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
       * Clear frontend authentication even if
       * backend logout fails.
       */
      clearAuthData();

      navigate("/login", {
        replace: true,
      });
    },
  });
}