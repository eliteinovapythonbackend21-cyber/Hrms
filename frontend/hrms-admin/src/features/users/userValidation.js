import { isRequired, isValidEmail, isValidMobile } from "@/utils/validators";

export const validateUser = (data, { isEdit = false } = {}) => {
  const errors = {};
  if (!isRequired(data.username)) errors.username = "Username is required";
  if (!isRequired(data.email)) errors.email = "Email is required";
  else if (!isValidEmail(data.email)) errors.email = "Enter a valid email address";
  if (!isEdit && !isRequired(data.password)) errors.password = "Password is required";
  if (data.mobile && !isValidMobile(data.mobile)) errors.mobile = "Enter a valid mobile number";
  return errors;
};

export const validateEditProfile = (data) => {
  const errors = {};
  if (!isRequired(data.username)) errors.username = "Username is required";
  if (!isRequired(data.email)) errors.email = "Email is required";
  else if (!isValidEmail(data.email)) errors.email = "Enter a valid email address";
  if (data.mobile && !isValidMobile(data.mobile)) errors.mobile = "Enter a valid mobile number";
  return errors;
};
