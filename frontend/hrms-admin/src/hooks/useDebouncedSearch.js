import { useState, useEffect } from "react";

// Debounce a search value so we don't fire API calls on every keystroke.
export function useDebouncedSearch(initialValue = "", delay = 400) {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return { value, setValue, debouncedValue };
}
