import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: "bg-green-600 dark:bg-green-500",
  error: "bg-red-600 dark:bg-red-500",
  warning: "bg-accent-500 dark:bg-accent-600",
  info: "bg-slate-700 dark:bg-slate-600",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-4 right-4 sm:left-auto z-[100] flex flex-col items-stretch sm:items-end gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${TOAST_STYLES[toast.type]} text-white px-4 py-3 rounded-md shadow-lg flex items-center justify-between gap-3 sm:min-w-[240px] sm:max-w-sm`}
          >
            <span className="text-sm">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/80 hover:text-white"
              aria-label="Dismiss"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
