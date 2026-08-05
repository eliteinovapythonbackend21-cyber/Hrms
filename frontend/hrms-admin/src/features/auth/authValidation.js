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
  return errors;
};
