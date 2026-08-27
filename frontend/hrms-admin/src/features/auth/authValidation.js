import { isValidEmail, isRequired } from "@/utils/validators";

export const validateLogin = (data) => {
  const errors = {};
  if (!isRequired(data.email)) errors.email = "Email is required";
  if (!isRequired(data.password)) errors.password = "Password is required";
  return errors;
};

export const validateRegister = (data) => {
  const errors = {};
  if (!isRequired(data.username)) errors.username = "Username is required";
  if (!isRequired(data.email)) errors.email = "Email is required";
  else if (!isValidEmail(data.email)) errors.email = "Enter a valid email address";
  if (!isRequired(data.password)) errors.password = "Password is required";
  else if (data.password.length < 6) errors.password = "Password must be at least 6 characters";
  if (data.mobile && !/^[0-9+\-\s]{10,15}$/.test(data.mobile)) {
    errors.mobile = "Enter a valid mobile number";
  }
  if (!isRequired(data.role)) errors.role = "Role is required";
  if (!isRequired(data.first_name)) errors.first_name = "First name is required";
  if (!isRequired(data.department_id)) errors.department_id = "Department is required";
  if (!isRequired(data.designation_id)) errors.designation_id = "Designation is required";
  return errors;
};

export const validateForgotPassword = (data) => {
  const errors = {};
  if (!isRequired(data.email)) errors.email = "Email is required";
  else if (!isValidEmail(data.email)) errors.email = "Enter a valid email address";
  return errors;
};

export const validateOtp = (data) => {
  const errors = {};
  if (!isRequired(data.otp)) errors.otp = "OTP is required";
  else if (!/^\d{6}$/.test(data.otp)) errors.otp = "Enter the 6-digit OTP";
  return errors;
};

export const validateResetPassword = (data) => {
  const errors = {};
  if (!isRequired(data.new_password)) errors.new_password = "New password is required";
  else if (data.new_password.length < 6) errors.new_password = "Password must be at least 6 characters";
  if (!isRequired(data.confirm_password)) errors.confirm_password = "Please confirm your password";
  else if (data.new_password !== data.confirm_password) errors.confirm_password = "Passwords do not match";
  return errors;
};

export const validateChangePassword = (data) => {
  const errors = {};
  if (!isRequired(data.current_password)) errors.current_password = "Current password is required";
  if (!isRequired(data.new_password)) errors.new_password = "New password is required";
  else if (data.new_password.length < 6) errors.new_password = "Password must be at least 6 characters";
  if (!isRequired(data.confirm_password)) errors.confirm_password = "Please confirm your password";
  else if (data.new_password !== data.confirm_password) errors.confirm_password = "Passwords do not match";
  return errors;
};