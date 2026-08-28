import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { isRequired } from "@/utils/validators";

/* =========================================================
   HELPERS
========================================================= */

function normalizeDate(value) {
  if (!value) {
    return "";
  }

  /*
   * HTML date inputs require:
   *
   * YYYY-MM-DD
   *
   * This also handles values such as:
   * 2026-08-19T00:00:00
   * 2026-08-19T00:00:00.000Z
   */
  return String(value).slice(0, 10);
}

/* =========================================================
   CUSTOM SELECT
========================================================= */

const SELECT_PANEL_GAP = 4;
const SELECT_PANEL_VIEWPORT_MARGIN = 8;
const SELECT_PANEL_MAX_HEIGHT = 240;

function CustomSelect({
  label,
  name,
  value,
  onChange,
  options = [],
  error,
  required,
  disabled,
  placeholder = "Select an option",
}) {
  const [open, setOpen] =
    useState(false);

  /*
   * The options list used to be an absolutely positioned child of this
   * wrapper. When this form is used inside a scrollable container (e.g.
   * the Add/Edit Modal's body), the browser clips a non-"visible"
   * overflow ancestor's descendants on BOTH axes, not just the one that
   * was set - so the dropdown got cut off partway down instead of
   * showing its own scrollbar cleanly, exactly like the earlier
   * "Previous Organization" hover popover bug.
   *
   * Fix: render the options panel through a React portal straight onto
   * document.body (outside any clipped scroll container) and position
   * it with `position: fixed` using coordinates measured live from the
   * trigger button. Nothing can clip it anymore.
   */

  const wrapperRef =
    useRef(null);

  const triggerRef =
    useRef(null);

  const panelRef =
    useRef(null);

  const [coords, setCoords] =
    useState({
      top: 0,
      left: 0,
      width: 0,
      maxHeight:
        SELECT_PANEL_MAX_HEIGHT,
    });

  const positionPanel = () => {
    const node =
      triggerRef.current;

    if (!node) {
      return;
    }

    const rect =
      node.getBoundingClientRect();

    const maxLeft =
      window.innerWidth -
      rect.width -
      SELECT_PANEL_VIEWPORT_MARGIN;

    const left = Math.max(
      SELECT_PANEL_VIEWPORT_MARGIN,
      Math.min(rect.left, maxLeft)
    );

    /*
     * Always open BELOW the trigger - never above it. If there isn't
     * enough room left in the viewport, shrink the panel instead of
     * flipping it above the field, and let it scroll internally.
     */
    const top =
      rect.bottom +
      SELECT_PANEL_GAP;

    const availableHeight =
      window.innerHeight -
      top -
      SELECT_PANEL_VIEWPORT_MARGIN;

    const maxHeight = Math.max(
      120,
      Math.min(
        SELECT_PANEL_MAX_HEIGHT,
        availableHeight
      )
    );

    setCoords({
      top,
      left,
      width: rect.width,
      maxHeight,
    });
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    positionPanel();

    const handleReposition =
      () => positionPanel();

    window.addEventListener(
      "scroll",
      handleReposition,
      true
    );

    window.addEventListener(
      "resize",
      handleReposition
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleReposition,
        true
      );

      window.removeEventListener(
        "resize",
        handleReposition
      );
    };
  }, [open]);

  useEffect(() => {
    const handleOutsideClick = (
      event
    ) => {
      if (
        wrapperRef.current &&
        wrapperRef.current.contains(
          event.target
        )
      ) {
        return;
      }

      if (
        panelRef.current &&
        panelRef.current.contains(
          event.target
        )
      ) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  const selectedOption =
    options.find(
      (option) =>
        String(option.value) ===
        String(value)
    );

  const handleSelect = (
    option
  ) => {
    onChange({
      target: {
        name,
        value: option.value,
        type: "select",
      },
    });

    setOpen(false);
  };

  return (
    <div
      className="relative mb-4"
      ref={wrapperRef}
    >
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen(
              (prev) => !prev
            );
          }
        }}
        className={`flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3 text-left text-sm outline-none transition
          ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
              : "border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10"
          }
          ${
            disabled
              ? "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800"
              : "cursor-pointer"
          }
          dark:border-slate-600 dark:bg-slate-800 dark:text-white
        `}
      >
        <span
          className={
            selectedOption
              ? "truncate text-slate-800 dark:text-white"
              : "truncate text-slate-400 dark:text-slate-500"
          }
        >
          {selectedOption?.label ||
            placeholder}
        </span>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`ml-2 h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            open
              ? "rotate-180"
              : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 9l6 6 6-6"
          />
        </svg>
      </button>

      {open &&
        !disabled &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              maxHeight:
                coords.maxHeight,
              zIndex: 9999,
            }}
            className="overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
          >
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">
                No options available
              </div>
            ) : (
              options.map(
                (option) => {
                  const isSelected =
                    String(
                      option.value
                    ) ===
                    String(
                      value
                    );

                  return (
                    <button
                      key={
                        option.value
                      }
                      type="button"
                      onClick={() =>
                        handleSelect(
                          option
                        )
                      }
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition
                        ${
                          isSelected
                            ? "bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400"
                            : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                        }
                      `}
                    >
                      <span className="truncate">
                        {
                          option.label
                        }
                      </span>

                      {isSelected && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="ml-2 h-4 w-4 shrink-0 text-primary-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={
                            2
                          }
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 12l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  );
                }
              )
            )}
          </div>,
          document.body
        )}

      {error && (
        <p className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

/* =========================================================
   GENERIC FORM
========================================================= */

export default function GenericForm({
  formId,
  fields,
  initialData = {},
  onSubmit,
  loading,
  readOnlyBanner,
  onCancel,
  isEdit,
}) {
  /* =======================================================
     BUILD INITIAL FORM
  ======================================================= */

  const buildInitial = () => {
    const obj = {};

    fields.forEach(
      (field) => {
        if (
          field.type ===
          "checkbox"
        ) {
          obj[field.name] =
            initialData[
              field.name
            ] !== undefined
              ? initialData[
                  field.name
                ]
              : field.defaultValue ??
                true;

          return;
        }

        let value =
          initialData[
            field.name
          ];

        if (
          value ===
            undefined ||
          value === null
        ) {
          value =
            field.defaultValue ??
            "";
        }

        /*
         * IMPORTANT:
         *
         * Normalize date values before
         * putting them into <input type="date">.
         */
        if (
          field.type ===
          "date"
        ) {
          value =
            normalizeDate(
              value
            );
        }

        obj[field.name] =
          value;
      }
    );

    return obj;
  };

  /* =======================================================
     FORM STATE
  ======================================================= */

  const [form, setForm] =
    useState(buildInitial);

  const [errors, setErrors] =
    useState({});

  /* =======================================================
     IMPORTANT:
     RESYNC FORM WHEN EDIT RECORD CHANGES
  ======================================================= */

  useEffect(() => {
    setForm(buildInitial());
    setErrors({});
  }, [initialData]);

  /* =======================================================
     CHANGE HANDLER
  ======================================================= */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm((prev) => ({
      ...prev,

      [name]:
        type ===
        "checkbox"
          ? checked
          : value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = {
          ...prev,
        };

        delete next[name];

        return next;
      });
    }
  };

  /* =======================================================
     VALIDATION
  ======================================================= */

  const validate = () => {
    const errs = {};

    fields.forEach(
      (field) => {
        if (
          field.required &&
          !isRequired(
            form[field.name]
          )
        ) {
          errs[field.name] =
            `${field.label} is required`;
        }
      }
    );

    return errs;
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    const errs =
      validate();

    setErrors(errs);

    if (
      Object.keys(errs)
        .length > 0
    ) {
      return;
    }

    onSubmit(form);
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="relative"
    >
      {readOnlyBanner && (
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {readOnlyBanner}
        </p>
      )}

      {fields.map(
        (field) => {
          /* =================================================
             SELECT
          ================================================= */

          if (
            field.type ===
            "select"
          ) {
            return (
              <CustomSelect
                key={
                  field.name
                }
                label={
                  field.label
                }
                name={
                  field.name
                }
                value={
                  form[
                    field.name
                  ]
                }
                onChange={
                  handleChange
                }
                options={
                  field.options ||
                  []
                }
                error={
                  errors[
                    field.name
                  ]
                }
                required={
                  field.required
                }
                disabled={
                  field.disabled
                }
                placeholder={
                  field.placeholder ||
                  `Select ${field.label}`
                }
              />
            );
          }

          /* =================================================
             CHECKBOX
          ================================================= */

          if (
            field.type ===
            "checkbox"
          ) {
            return (
              <div
                className="mb-4"
                key={
                  field.name
                }
              >
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    name={
                      field.name
                    }
                    checked={!!form[
                      field.name
                    ]}
                    onChange={
                      handleChange
                    }
                    disabled={
                      field.disabled
                    }
                    className="h-4 w-4"
                  />

                  {
                    field.label
                  }
                </label>

                {errors[
                  field.name
                ] && (
                  <p className="mt-1 text-xs text-red-500">
                    {
                      errors[
                        field.name
                      ]
                    }
                  </p>
                )}
              </div>
            );
          }

          /* =================================================
             TEXTAREA
          ================================================= */

          if (
            field.type ===
            "textarea"
          ) {
            return (
              <div
                className="mb-4"
                key={
                  field.name
                }
              >
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {
                    field.label
                  }

                  {field.required && (
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  )}
                </label>

                <textarea
                  name={
                    field.name
                  }
                  value={
                    form[
                      field.name
                    ]
                  }
                  onChange={
                    handleChange
                  }
                  rows={3}
                  className={`input ${
                    errors[
                      field.name
                    ]
                      ? "border-red-500"
                      : ""
                  }`}
                  placeholder={
                    field.placeholder
                  }
                  disabled={
                    field.disabled
                  }
                />

                {errors[
                  field.name
                ] && (
                  <p className="mt-1 text-xs text-red-500">
                    {
                      errors[
                        field.name
                      ]
                    }
                  </p>
                )}
              </div>
            );
          }

          /* =================================================
             INPUT
          ================================================= */

          return (
            <Input
              key={
                field.name
              }
              label={
                field.label
              }
              name={
                field.name
              }
              type={
                field.type ||
                "text"
              }
              value={
                form[
                  field.name
                ]
              }
              onChange={
                handleChange
              }
              error={
                errors[
                  field.name
                ]
              }
              required={
                field.required
              }
              placeholder={
                field.placeholder
              }
              disabled={
                field.disabled
              }
            />
          );
        }
      )}

      {/* =====================================================
          ACTIONS
      ===================================================== */}

      <div className="mt-6 flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}

        <Button
          type="submit"
          isLoading={loading}
        >
          {isEdit
            ? "Update"
            : "Create"}
        </Button>
      </div>
    </form>
  );
}