import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { employeesApi } from "@/api/employees.api";

/* ============================================================
   CONSTANTS
============================================================ */

const HIERARCHY_LEVELS = [
  { value: "Level 1", label: "Level 1" },
  { value: "Level 2", label: "Level 2" },
  { value: "Level 3", label: "Level 3" },
  { value: "Level 4", label: "Level 4" },
  { value: "Level 5", label: "Level 5" },
];

const SCORE_MIN = 0;
const SCORE_MAX = 5;

/* ============================================================
   HELPERS
============================================================ */

function getEmployeeName(employee) {
  if (!employee) return "-";

  const fullName = [
    employee.first_name,
    employee.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    employee.employee_code ||
    `Employee #${employee.id}`
  );
}

function getEmployeeLabel(employee) {
  if (!employee) return "-";

  const name = getEmployeeName(employee);
  const code = employee.employee_code;

  return code ? `${name} (${code})` : name;
}

function normalizeNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return "";
  }

  return parsed;
}

function calculateOverallRating(
  dayToDay,
  work,
  behavioral
) {
  const values = [
    dayToDay,
    work,
    behavioral,
  ]
    .map((value) => Number(value))
    .filter(
      (value) =>
        !Number.isNaN(value) &&
        value >= SCORE_MIN &&
        value <= SCORE_MAX
    );

  if (values.length === 0) {
    return "";
  }

  const total = values.reduce(
    (sum, value) => sum + value,
    0
  );

  return Number(
    (total / values.length).toFixed(1)
  );
}

/* ============================================================
   SMALL UI COMPONENTS
============================================================ */

function FieldLabel({
  children,
  required = false,
}) {
  return (
    <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
      {children}
      {required && (
        <span className="ml-1 text-red-500">*</span>
      )}
    </label>
  );
}

function FieldError({ children }) {
  if (!children) return null;

  return (
    <p className="mt-1 text-[11px] font-medium text-red-500">
      {children}
    </p>
  );
}

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white";

const selectClassName =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white";

const textareaClassName =
  "min-h-[100px] w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white";

/* ============================================================
   FORM
============================================================ */

export default function PerformanceReviewForm({
  initialData = {},
  isEdit = false,
  onSubmit,
  onCancel,
  loading = false,
}) {
  /* ----------------------------------------------------------
     EMPLOYEES
  ---------------------------------------------------------- */

  const {
    data: employeesData,
    isLoading: employeesLoading,
    isError: employeesError,
  } = useQuery({
    queryKey: [
      "performance-review-form-employees",
    ],
    queryFn: async () => {
      const response = await employeesApi.list({
        page: 1,
        per_page: 1000,
        is_active: true,
      });

      return response?.data?.data || {};
    },
    staleTime: 5 * 60 * 1000,
  });

  const employees = useMemo(
    () =>
      employeesData?.items ||
      employeesData?.data ||
      [],
    [employeesData]
  );

  /* ----------------------------------------------------------
     FORM STATE
  ---------------------------------------------------------- */

  const [form, setForm] = useState({
    employee_id:
      initialData?.employee_id
        ? String(initialData.employee_id)
        : "",

    review_period:
      initialData?.review_period || "",

    hierarchy_level:
      initialData?.hierarchy_level || "",

    day_to_day_performance:
      normalizeNumber(
        initialData?.day_to_day_performance
      ),

    work_performance:
      normalizeNumber(
        initialData?.work_performance
      ),

    behavioral_performance:
      normalizeNumber(
        initialData?.behavioral_performance
      ),

    rating:
      normalizeNumber(initialData?.rating),

    remarks:
      initialData?.remarks || "",

    is_active:
      initialData?.is_active !== undefined
        ? Boolean(initialData.is_active)
        : true,
  });

  const [errors, setErrors] = useState({});

  /* ----------------------------------------------------------
     UPDATE FORM WHEN EDIT RECORD CHANGES
  ---------------------------------------------------------- */

  useEffect(() => {
    setForm({
      employee_id:
        initialData?.employee_id
          ? String(initialData.employee_id)
          : "",

      review_period:
        initialData?.review_period || "",

      hierarchy_level:
        initialData?.hierarchy_level || "",

      day_to_day_performance:
        normalizeNumber(
          initialData?.day_to_day_performance
        ),

      work_performance:
        normalizeNumber(
          initialData?.work_performance
        ),

      behavioral_performance:
        normalizeNumber(
          initialData?.behavioral_performance
        ),

      rating:
        normalizeNumber(initialData?.rating),

      remarks:
        initialData?.remarks || "",

      is_active:
        initialData?.is_active !== undefined
          ? Boolean(initialData.is_active)
          : true,
    });

    setErrors({});
  }, [initialData]);

  /* ----------------------------------------------------------
     AUTO CALCULATED OVERALL RATING
  ---------------------------------------------------------- */

  const calculatedRating = useMemo(
    () =>
      calculateOverallRating(
        form.day_to_day_performance,
        form.work_performance,
        form.behavioral_performance
      ),
    [
      form.day_to_day_performance,
      form.work_performance,
      form.behavioral_performance,
    ]
  );

  /*
   * Use the calculated rating whenever all three performance
   * scores are available.
   */
  useEffect(() => {
    if (calculatedRating === "") return;

    setForm((current) => ({
      ...current,
      rating: calculatedRating,
    }));
  }, [calculatedRating]);

  /* ----------------------------------------------------------
     FIELD CHANGE
  ---------------------------------------------------------- */

  const handleChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? checked
          : name ===
              "day_to_day_performance" ||
            name === "work_performance" ||
            name ===
              "behavioral_performance" ||
            name === "rating"
          ? normalizeNumber(value)
          : value,
    }));

    setErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const updated = {
        ...current,
      };

      delete updated[name];

      return updated;
    });
  };

  /* ----------------------------------------------------------
     SCORE VALIDATION
  ---------------------------------------------------------- */

  const validateScore = (
    value,
    label
  ) => {
    if (
      value === "" ||
      value === null ||
      value === undefined
    ) {
      return `${label} is required`;
    }

    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
      return `${label} must be a valid number`;
    }

    if (
      numericValue < SCORE_MIN ||
      numericValue > SCORE_MAX
    ) {
      return `${label} must be between ${SCORE_MIN} and ${SCORE_MAX}`;
    }

    return "";
  };

  /* ----------------------------------------------------------
     VALIDATION
  ---------------------------------------------------------- */

  const validate = () => {
    const nextErrors = {};

    if (!form.employee_id) {
      nextErrors.employee_id =
        "Employee is required";
    }

    if (!form.review_period.trim()) {
      nextErrors.review_period =
        "Review period is required";
    }

    if (!form.hierarchy_level) {
      nextErrors.hierarchy_level =
        "Hierarchy level is required";
    }

    const dayToDayError =
      validateScore(
        form.day_to_day_performance,
        "Day-to-day performance"
      );

    if (dayToDayError) {
      nextErrors.day_to_day_performance =
        dayToDayError;
    }

    const workError =
      validateScore(
        form.work_performance,
        "Work performance"
      );

    if (workError) {
      nextErrors.work_performance =
        workError;
    }

    const behavioralError =
      validateScore(
        form.behavioral_performance,
        "Behavioral performance"
      );

    if (behavioralError) {
      nextErrors.behavioral_performance =
        behavioralError;
    }

    const ratingError =
      validateScore(
        form.rating,
        "Overall rating"
      );

    if (ratingError) {
      nextErrors.rating = ratingError;
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  };

  /* ----------------------------------------------------------
     SUBMIT
  ---------------------------------------------------------- */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    if (!validate()) {
      return;
    }

    const payload = {
      employee_id: Number(form.employee_id),

      review_period:
        form.review_period.trim(),

      hierarchy_level:
        form.hierarchy_level,

      day_to_day_performance:
        Number(
          form.day_to_day_performance
        ),

      work_performance:
        Number(form.work_performance),

      behavioral_performance:
        Number(
          form.behavioral_performance
        ),

      rating: Number(form.rating),

      remarks:
        form.remarks.trim() || null,

      ...(isEdit
        ? {
            is_active: Boolean(
              form.is_active
            ),
          }
        : {}),
    };

    await onSubmit(payload);
  };

  /* ----------------------------------------------------------
     SELECTED EMPLOYEE
  ---------------------------------------------------------- */

  const selectedEmployee = useMemo(() => {
    if (!form.employee_id) {
      return null;
    }

    return (
      employees.find(
        (employee) =>
          String(employee.id) ===
          String(form.employee_id)
      ) || null
    );
  }, [
    employees,
    form.employee_id,
  ]);

  /* ----------------------------------------------------------
     RENDER
  ---------------------------------------------------------- */

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {/* ======================================================
          EMPLOYEE / REVIEW INFORMATION
      ====================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Review Information
          </h3>

          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Select the employee and define the
            performance review period.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* EMPLOYEE */}

          <div>
            <FieldLabel required>
              Employee
            </FieldLabel>

            <select
              name="employee_id"
              value={form.employee_id}
              onChange={handleChange}
              disabled={
                loading ||
                isEdit ||
                employeesLoading
              }
              className={`${selectClassName} ${
                errors.employee_id
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                  : ""
              } ${
                isEdit
                  ? "cursor-not-allowed opacity-70"
                  : ""
              }`}
            >
              <option value="">
                {employeesLoading
                  ? "Loading employees..."
                  : "Select employee"}
              </option>

              {employees.map((employee) => (
                <option
                  key={employee.id}
                  value={employee.id}
                >
                  {getEmployeeLabel(employee)}
                </option>
              ))}
            </select>

            <FieldError>
              {errors.employee_id}
            </FieldError>

            {employeesError && (
              <p className="mt-1 text-[11px] text-red-500">
                Unable to load employees.
              </p>
            )}
          </div>

          {/* REVIEW PERIOD */}

          <div>
            <FieldLabel required>
              Review Period
            </FieldLabel>

            <input
              type="text"
              name="review_period"
              value={form.review_period}
              onChange={handleChange}
              disabled={loading}
              placeholder="Example: Q1 2026"
              className={`${inputClassName} ${
                errors.review_period
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                  : ""
              }`}
            />

            <FieldError>
              {errors.review_period}
            </FieldError>
          </div>

          {/* HIERARCHY LEVEL */}

          <div>
            <FieldLabel required>
              Hierarchy Level
            </FieldLabel>

            <select
              name="hierarchy_level"
              value={form.hierarchy_level}
              onChange={handleChange}
              disabled={loading}
              className={`${selectClassName} ${
                errors.hierarchy_level
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                  : ""
              }`}
            >
              <option value="">
                Select hierarchy level
              </option>

              {HIERARCHY_LEVELS.map(
                (level) => (
                  <option
                    key={level.value}
                    value={level.value}
                  >
                    {level.label}
                  </option>
                )
              )}
            </select>

            <FieldError>
              {errors.hierarchy_level}
            </FieldError>
          </div>

          {/* EMPLOYEE SUMMARY */}

          <div>
            <FieldLabel>
              Employee Details
            </FieldLabel>

            <div className="flex min-h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800">
              {selectedEmployee ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                    {getEmployeeName(
                      selectedEmployee
                    )}
                  </p>

                  <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    {selectedEmployee.employee_code ||
                      `Employee #${selectedEmployee.id}`}
                  </p>
                </div>
              ) : (
                <span className="text-xs text-slate-400">
                  Employee details will appear here
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          PERFORMANCE SCORES
      ====================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Performance Evaluation
          </h3>

          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Rate each performance category from
            0 to 5.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* DAY TO DAY */}

          <div>
            <FieldLabel required>
              Day-to-Day Performance
            </FieldLabel>

            <input
              type="number"
              name="day_to_day_performance"
              value={
                form.day_to_day_performance
              }
              onChange={handleChange}
              disabled={loading}
              min={SCORE_MIN}
              max={SCORE_MAX}
              step="0.1"
              placeholder="0 - 5"
              className={`${inputClassName} ${
                errors.day_to_day_performance
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                  : ""
              }`}
            />

            <FieldError>
              {
                errors.day_to_day_performance
              }
            </FieldError>
          </div>

          {/* WORK */}

          <div>
            <FieldLabel required>
              Work Performance
            </FieldLabel>

            <input
              type="number"
              name="work_performance"
              value={
                form.work_performance
              }
              onChange={handleChange}
              disabled={loading}
              min={SCORE_MIN}
              max={SCORE_MAX}
              step="0.1"
              placeholder="0 - 5"
              className={`${inputClassName} ${
                errors.work_performance
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                  : ""
              }`}
            />

            <FieldError>
              {errors.work_performance}
            </FieldError>
          </div>

          {/* BEHAVIOR */}

          <div>
            <FieldLabel required>
              Behavioral Performance
            </FieldLabel>

            <input
              type="number"
              name="behavioral_performance"
              value={
                form.behavioral_performance
              }
              onChange={handleChange}
              disabled={loading}
              min={SCORE_MIN}
              max={SCORE_MAX}
              step="0.1"
              placeholder="0 - 5"
              className={`${inputClassName} ${
                errors.behavioral_performance
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                  : ""
              }`}
            />

            <FieldError>
              {
                errors.behavioral_performance
              }
            </FieldError>
          </div>
        </div>

        {/* SCORE GUIDE */}

        <div className="mt-4 grid grid-cols-5 gap-2">
          <div className="rounded-lg bg-slate-50 px-2 py-2 text-center dark:bg-slate-800">
            <p className="text-sm font-bold text-slate-800 dark:text-white">
              1
            </p>
            <p className="mt-0.5 text-[9px] text-slate-400">
              Poor
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 px-2 py-2 text-center dark:bg-slate-800">
            <p className="text-sm font-bold text-slate-800 dark:text-white">
              2
            </p>
            <p className="mt-0.5 text-[9px] text-slate-400">
              Needs Improvement
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 px-2 py-2 text-center dark:bg-slate-800">
            <p className="text-sm font-bold text-slate-800 dark:text-white">
              3
            </p>
            <p className="mt-0.5 text-[9px] text-slate-400">
              Meets Expectations
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 px-2 py-2 text-center dark:bg-slate-800">
            <p className="text-sm font-bold text-slate-800 dark:text-white">
              4
            </p>
            <p className="mt-0.5 text-[9px] text-slate-400">
              Exceeds Expectations
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 px-2 py-2 text-center dark:bg-slate-800">
            <p className="text-sm font-bold text-slate-800 dark:text-white">
              5
            </p>
            <p className="mt-0.5 text-[9px] text-slate-400">
              Outstanding
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================
          OVERALL RATING
      ====================================================== */}

      <div className="rounded-xl border border-primary-100 bg-primary-50/50 p-4 shadow-sm dark:border-primary-500/20 dark:bg-primary-500/5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <FieldLabel required>
              Overall Rating
            </FieldLabel>

            <input
              type="number"
              name="rating"
              value={form.rating}
              onChange={handleChange}
              disabled={loading}
              min={SCORE_MIN}
              max={SCORE_MAX}
              step="0.1"
              placeholder="Calculated from performance scores"
              className={`${inputClassName} bg-white dark:bg-slate-900 ${
                errors.rating
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                  : "border-primary-200 dark:border-primary-500/30"
              }`}
            />

            <FieldError>
              {errors.rating}
            </FieldError>

            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              The rating is automatically calculated
              from the three performance scores, but
              it can still be adjusted manually.
            </p>
          </div>

          <div className="flex items-center justify-center rounded-lg border border-primary-200 bg-white px-4 py-4 text-center dark:border-primary-500/20 dark:bg-slate-900">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-500">
                Calculated Overall
              </p>

              <p className="mt-1 text-3xl font-bold text-primary-700 dark:text-primary-300">
                {calculatedRating !== ""
                  ? Number(
                      calculatedRating
                    ).toFixed(1)
                  : "—"}
              </p>

              <p className="mt-1 text-[10px] text-slate-400">
                Average of Day-to-Day, Work and
                Behavioral performance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          REMARKS
      ====================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <FieldLabel>
          Remarks
        </FieldLabel>

        <textarea
          name="remarks"
          value={form.remarks}
          onChange={handleChange}
          disabled={loading}
          placeholder="Enter comments, observations, achievements, improvement areas, or other review remarks..."
          className={textareaClassName}
        />

        <p className="mt-1 text-[10px] text-slate-400">
          Optional
        </p>
      </div>

      {/* ======================================================
          STATUS
      ====================================================== */}

      {isEdit && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">
                Active Review
              </p>

              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Keep this performance review active.
              </p>
            </div>

            <input
              type="checkbox"
              name="is_active"
              checked={Boolean(
                form.is_active
              )}
              onChange={handleChange}
              disabled={loading}
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
          </label>
        </div>
      )}

      {/* ======================================================
          ACTIONS
      ====================================================== */}

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end dark:border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="h-10 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          className="h-10 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? isEdit
              ? "Updating..."
              : "Saving..."
            : isEdit
            ? "Update Review"
            : "Save Review"}
        </button>
      </div>
    </form>
  );
}