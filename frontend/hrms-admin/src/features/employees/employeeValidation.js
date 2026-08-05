import { isRequired } from "@/utils/validators";

export const validateEmployee = (data) => {
  const errors = {};
  if (!isRequired(data.employee_code)) errors.employee_code = "Employee code is required";
  if (!isRequired(data.user_id)) errors.user_id = "User ID is required";
  else if (Number.isNaN(Number(data.user_id))) errors.user_id = "User ID must be a number";
  if (!isRequired(data.department_id)) errors.department_id = "Department is required";
  if (!isRequired(data.designation_id)) errors.designation_id = "Designation is required";
  if (!isRequired(data.first_name)) errors.first_name = "First name is required";
  if (data.salary !== "" && data.salary !== undefined && Number.isNaN(Number(data.salary))) {
    errors.salary = "Salary must be a number";
  }
  return errors;
};
