import { isRequired, isValidEmail, isValidMobile } from "@/utils/validators";

export const validateUser = (data, { isEdit = false } = {}) => {
  const errors = {};
  if (!isRequired(data.username)) errors.username = "Username is required";
  else if (data.username.trim().length < 3) errors.username = "Username must be at least 3 characters";
  if (!isRequired(data.email)) errors.email = "Email is required";
  else if (!isValidEmail(data.email)) errors.email = "Enter a valid email address";
  if (!isEdit) {
    if (!isRequired(data.password)) errors.password = "Password is required";
    else if (data.password.length < 6) errors.password = "Password must be at least 6 characters";
  }
  if (data.mobile && !isValidMobile(data.mobile)) errors.mobile = "Enter a valid mobile number";
  if (!isEdit && data.role === "employee") {
    if (!isRequired(data.first_name)) errors.first_name = "First name is required";
    if (!isRequired(data.department_id)) errors.department_id = "Department is required";
    if (!isRequired(data.designation_id)) errors.designation_id = "Designation is required";
  }
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
