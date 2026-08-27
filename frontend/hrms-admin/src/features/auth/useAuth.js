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
      /*
       * Supports both:
       *
       * {
       *   token,
       *   user
       * }
       *
       * and:
       *
       * {
       *   access_token,
       *   user
       * }
       */

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

      /*
       * If registration automatically logs the user in,
       * store the authentication data.
       */
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
   RESET PASSWORD
============================================================ */

export function useResetPassword() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (data) => {
      /*
       * Expected data:
       *
       * {
       *   token: "...",
       *   password: "new password"
       * }
       *
       * or whatever structure your authApi.resetPassword()
       * already expects.
       */
      return await authApi.resetPassword(data);
    },

    onSuccess: (response) => {
      showToast?.(
        response?.message ||
          "Password reset successfully. Please login with your new password.",
        "success"
      );

      /*
       * After successful password reset,
       * send the user back to login.
       */
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
      /*
       * If your backend has a logout endpoint,
       * this will call it.
       *
       * If authApi.logout() does not exist, remove this
       * API call and only clear local authentication data.
       */
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
       * Even if the backend logout request fails,
       * clear the local session.
       */
      clearAuthData();

      navigate("/login", {
        replace: true,
      });
    },
  });
}