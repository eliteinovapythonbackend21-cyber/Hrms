// Validate that a start date is not after an end date.
export const isDateRangeValid = (fromDate, toDate) => {
  if (!fromDate || !toDate) return true;
  return new Date(fromDate) <= new Date(toDate);
};

// Check whether two date ranges overlap.
export const rangesOverlap = (startA, endA, startB, endB) => {
  return startA <= endB && startB <= endA;
};

// Validate email format.
export const isValidEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Validate a mobile number (basic, 10-15 digits).
export const isValidMobile = (mobile) => {
  if (!mobile) return true; // optional
  return /^[0-9+\-\s]{10,15}$/.test(mobile);
};

// Required field helper.
export const isRequired = (value) => {
  if (value === null || value === undefined) return false;
  return String(value).trim().length > 0;
};

// Validate a date (YYYY-MM-DD or Date) is not after today.
export const isNotFutureDate = (value) => {
  if (!value) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date <= today;
};

// Validate a person/place name (letters, spaces, hyphens, apostrophes).
export const isValidName = (value) => {
  if (!value) return true;
  return /^[A-Za-z][A-Za-z\s'-]*$/.test(value.trim());
};

// Validate a postal/pincode (4-10 alphanumeric characters).
export const isValidPincode = (value) => {
  if (!value) return true;
  return /^[A-Za-z0-9\s-]{4,10}$/.test(value.trim());
};

// Validate a non-negative number.
export const isNonNegativeNumber = (value) => {
  if (value === "" || value === null || value === undefined) return true;
  const num = Number(value);
  return !Number.isNaN(num) && num >= 0;
};

// Build a FormData object from a plain object (for file uploads).
export const toFormData = (payload) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      formData.append(key, value);
    }
  });
  return formData;
};
