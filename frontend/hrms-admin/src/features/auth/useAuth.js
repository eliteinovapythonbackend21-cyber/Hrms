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
      /*
       * Expected payload:
       *
       * {
       *   email: "user@example.com"
       * }
       *
       * The backend will:
       *
       * 1. Find the user
       * 2. Generate reset token
       * 3. Load SMTP credentials
       * 4. Send password reset email
       */

      return await authApi.forgotPassword(data);
    },

    onSuccess: (response) => {
      showToast?.(
        response?.message ||
          "Password reset instructions have been sent to your email.",
        "success"
      );
    },

    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Unable to send password reset email.";

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
      /*
       * Expected payload:
       *
       * {
       *   token: "...",
       *   password: "new password"
       * }
       */

      return await authApi.resetPassword(data);
    },

    onSuccess: (response) => {
      showToast?.(
        response?.message ||
          "Password reset successfully. Please login with your new password.",
        "success"
      );

      navigate("/login", {
        replace: true,
      });
    },

    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
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
      clearAuthData();

      navigate("/login", {
        replace: true,
      });
    },
  });
}