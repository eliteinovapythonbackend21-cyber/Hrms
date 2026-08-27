import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/api/auth.api";
import { setToken, setUser, clearToken } from "@/utils/tokenHelpers";

/**
 * Validate whether the selected login type matches
 * the authenticated user's actual account type.
 */
const validateLoginType = (user, loginType) => {
  const role = String(
    user?.role ||
      user?.role_name ||
      user?.user_role ||
      user?.user_type ||
      ""
  ).toLowerCase();

  const adminRoles = [
    "admin",
    "super_admin",
    "superadmin",
    "hr_admin",
    "hradmin",
  ];

  const employeeRoles = [
    "employee",
    "staff",
  ];

  const isAdmin = adminRoles.includes(role);
  const isEmployee = employeeRoles.includes(role);

  // Admin Login selected, but Employee account used
  if (loginType === "admin" && !isAdmin) {
    const error = new Error(
      "This account is registered as an Employee. Please use Employee Login."
    );

    error.code = "WRONG_LOGIN_TYPE";

    error.response = {
      data: {
        message:
          "This account is registered as an Employee. Please use Employee Login.",
        loginType: "employee",
      },
    };

    throw error;
  }

  // Employee Login selected, but Admin account used
  if (loginType === "employee" && !isEmployee) {
    const error = new Error(
      "This account is registered as an Admin. Please use Admin Login."
    );

    error.code = "WRONG_LOGIN_TYPE";

    error.response = {
      data: {
        message:
          "This account is registered as an Admin. Please use Admin Login.",
        loginType: "admin",
      },
    };

    throw error;
  }

  return true;
};

export function useLogin() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (payload) => {
      // Authenticate email and password first
      const response = await authApi.login(payload);

      const { user, role } = response.data;

      // Some backend responses only include `role` as a top-level sibling
      // key (response.data.role) rather than nested on the user object
      // itself (response.data.user.role). Merge it in as a fallback so
      // validateLoginType never fails purely due to response shape, and
      // so the object we eventually store always carries a usable role.
      const effectiveUser = {
        ...user,
        role: user?.role || role,
      };

      // Validate login type before saving authentication data
      validateLoginType(effectiveUser, payload.login_type);

      return { ...response, effectiveUser };
    },

    onSuccess: (result) => {
      const { access_token } = result.data;
      const { effectiveUser } = result;

      // Save token/user only after login type validation succeeds
      setToken(access_token);
      setUser(effectiveUser);

      navigate("/dashboard");
    },
  });
}

export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload) => authApi.register(payload),

    onSuccess: () => {
      navigate("/login");
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();

  return () => {
    clearToken();
    navigate("/login");
  };
}

/* ============================================================
   FORGOT PASSWORD / OTP / RESET PASSWORD
============================================================ */

export function useForgotPassword() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload) => authApi.forgotPassword(payload),

    onSuccess: (_res, variables) => {
      // Carry the email forward so the next screen doesn't ask for it again
      navigate(`/verify-otp?email=${encodeURIComponent(variables.email)}`);
    },
  });
}

export function useVerifyOtp() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload) => authApi.verifyOtp(payload),

    onSuccess: (_res, variables) => {
      navigate(`/reset-password?email=${encodeURIComponent(variables.email)}`);
    },
  });
}

export function useResetPassword() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload) => authApi.resetPassword(payload),

    onSuccess: () => {
      navigate("/login");
    },
  });
}

/* ============================================================
   CHANGE PASSWORD (authenticated — used from a settings/profile page,
   not the forgot-password flow, so it does not auto-navigate)
============================================================ */

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload) => authApi.changePassword(payload),
  });
}