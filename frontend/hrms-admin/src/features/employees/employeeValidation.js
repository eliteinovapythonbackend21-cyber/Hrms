import {
  isRequired,
  isNotFutureDate,
  isValidName,
  isValidEmail,
  isValidPincode,
  isValidMobile,
  isNonNegativeNumber,
} from "@/utils/validators";

export const validateEmployee = (data, { isEdit = false } = {}) => {
  const errors = {};
  if (!isRequired(data.employee_code)) errors.employee_code = "Employee code is required";

  if (!isRequired(data.email)) errors.email = "Email is required";
  else if (!isValidEmail(data.email)) errors.email = "Enter a valid email address";

  if (!isEdit) {
    if (!isRequired(data.password)) errors.password = "Password is required";
    else if (data.password.length < 6) errors.password = "Password must be at least 6 characters";
  }

  if (!isRequired(data.department_id)) errors.department_id = "Department is required";
  if (!isRequired(data.designation_id)) errors.designation_id = "Designation is required";

  if (!isRequired(data.first_name)) errors.first_name = "First name is required";
  else if (!isValidName(data.first_name)) errors.first_name = "First name must contain only letters";

  if (data.last_name && !isValidName(data.last_name)) errors.last_name = "Last name must contain only letters";

  if (data.gender && !["Male", "Female", "Other"].includes(data.gender)) {
    errors.gender = "Select a valid gender";
  }

  if (data.dob && !isNotFutureDate(data.dob)) errors.dob = "Date of birth cannot be in the future";

  if (data.phone && !isValidMobile(data.phone)) errors.phone = "Enter a valid phone number";
  if (data.emergency_contact && !isValidMobile(data.emergency_contact)) {
    errors.emergency_contact = "Enter a valid emergency contact number";
  }

  if (data.city && !isValidName(data.city)) errors.city = "City must contain only letters";
  if (data.state && !isValidName(data.state)) errors.state = "State must contain only letters";
  if (data.country && !isValidName(data.country)) errors.country = "Country must contain only letters";
  if (data.pincode && !isValidPincode(data.pincode)) errors.pincode = "Enter a valid pincode";

  if (data.joining_date && !isNotFutureDate(data.joining_date)) {
    errors.joining_date = "Joining date cannot be in the future";
  }

  if (data.salary !== "" && data.salary !== undefined && data.salary !== null) {
    if (Number.isNaN(Number(data.salary))) errors.salary = "Salary must be a number";
    else if (!isNonNegativeNumber(data.salary)) errors.salary = "Salary cannot be negative";
  }

  return errors;
};
