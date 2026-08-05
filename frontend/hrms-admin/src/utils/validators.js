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
