import { useState, useRef, useEffect } from "react";

// Minimal trigger+panel menu: click the trigger to open, click outside or
// press Escape to close. `children` is a render-prop receiving `close` so
// menu items can dismiss the panel after acting.
export default function Dropdown({ trigger, children, align = "right", panelClassName = "" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="relative" ref={rootRef}>
      <button type="button" onClick={() => setOpen((prev) => !prev)} aria-expanded={open}>
        {trigger}
      </button>
      {open && (
        <div
          className={`absolute z-50 mt-2 min-w-[12rem] py-1 card ${
            align === "right" ? "right-0" : "left-0"
          } ${panelClassName}`}
        >
          {typeof children === "function" ? children({ close }) : children}
        </div>
      )}
    </div>
  );
}
