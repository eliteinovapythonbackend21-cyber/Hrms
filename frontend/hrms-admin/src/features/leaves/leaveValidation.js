import { isRequired, isDateRangeValid } from "@/utils/validators";

export const validateLeave = (data, { isAdmin = false } = {}) => {
  const errors = {};
  if (isAdmin && !isRequired(data.employee_id)) errors.employee_id = "Employee is required";
  if (!isRequired(data.leave_type_id)) errors.leave_type_id = "Leave type is required";
  if (!isRequired(data.from_date)) errors.from_date = "From date is required";
  if (!isRequired(data.to_date)) errors.to_date = "To date is required";
  if (data.from_date && data.to_date && !isDateRangeValid(data.from_date, data.to_date)) {
    errors.to_date = "To date must be on or after the from date";
  }
  return errors;
};
