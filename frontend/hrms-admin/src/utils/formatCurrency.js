// Format a numeric salary (Numeric(12,2)) into a currency string.
export const formatCurrency = (value, currency = "INR") => {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

// Parse a currency value back to a plain number.
export const parseCurrency = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const num = Number(cleaned);
  return Number.isNaN(num) ? 0 : num;
};
