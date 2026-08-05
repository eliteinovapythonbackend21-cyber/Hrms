import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  // Rendered through a portal to document.body: modals get invoked from all
  // over the tree (including inside the header, which gets a backdrop-blur
  // in dark mode), and `backdrop-filter`/`filter`/`transform` on ANY
  // ancestor turns it into the containing block for `position: fixed`
  // descendants — trapping the modal inside that ancestor's own small box
  // instead of covering the viewport. A portal sidesteps that entirely.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full my-auto flex flex-col max-h-[calc(100vh-2rem)] ${sizes[size]}`}
      >
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
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
        <div className="px-6 py-4 overflow-y-auto min-h-0">{children}</div>
        {footer && (
          <div className="shrink-0 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
