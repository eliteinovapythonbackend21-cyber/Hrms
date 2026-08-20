import { useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import { employeesApi } from "@/api/employees.api";
import { masterApi } from "@/api/master.api";
import { useCompanies } from "@/features/master/company/useCompanies";

/* =========================================================
   TRANSFER REASONS
========================================================= */

const COMMON_TRANSFER_REASONS = [
  "Business Requirement",
  "Department Requirement",
  "Employee Request",
  "Promotion / Career Growth",
  "Role Change",
  "Project Requirement",
  "Branch Requirement",
  "Relocation",
  "Performance",
  "Organizational Restructuring",
  "Other",
];

/* =========================================================
   STYLES
========================================================= */

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white";

const labelClass =
  "mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300";

/* =========================================================
   DEFAULT FORM
========================================================= */

const DEFAULT_FORM = {
  employee_id: "",
  from_department_id: "",
  to_department_id: "",
  transfer_reason: "Other",
  transfer_apply_date: "",
  relieving_date: "",
  joining_date: "",
  location: "",
  accomplishments: "",
  is_active: true,
};

/* =========================================================
   HELPERS
========================================================= */

/**
 * Normalize any date value coming from the API (or a JS Date
 * object) into the strict YYYY-MM-DD format required by
 * HTML <input type="date">.
 *
 * Handles:
 *  - "" / null / undefined                -> ""
 *  - Date instances                        -> local YYYY-MM-DD
 *  - "YYYY-MM-DD"                          -> as-is
 *  - "YYYY-MM-DDT00:00:00[.000Z]"          -> date part only
 *  - "YYYY-MM-DD 00:00:00"                 -> date part only
 *  - Any other parseable date string       -> local YYYY-MM-DD
 *  - Anything unparseable                  -> ""
 *
 * IMPORTANT: When falling back to `new Date(value)`, we rebuild
 * the string from getFullYear()/getMonth()/getDate() (LOCAL
 * time) rather than toISOString() (UTC), so the date never
 * shifts by a day due to timezone conversion. This was the
 * root cause of the Transfer Apply Date / Relieving Date /
 * Joining Date fields sometimes appearing blank when editing.
 */
function normalizeDate(value) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return "";
    }

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const stringValue = String(value).trim();

  if (!stringValue) {
    return "";
  }

  /*
   * Fast path: value already starts with YYYY-MM-DD
   * (covers "YYYY-MM-DD", "YYYY-MM-DDT...", "YYYY-MM-DD ...").
   */
  const isoMatch = stringValue.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  /*
   * Fallback: try to parse whatever format was given
   * and rebuild using LOCAL date parts.
   */
  const parsed = new Date(stringValue);

  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return "";
}

function normalizeTransferData(
  initialData = {}
) {
  return {
    employee_id:
      initialData?.employee_id ??
      initialData?.employee?.id ??
      "",

    from_department_id:
      initialData?.from_department_id ??
      initialData?.from_department?.id ??
      "",

    to_department_id:
      initialData?.to_department_id ??
      initialData?.to_department?.id ??
      "",

    transfer_reason:
      initialData?.transfer_reason ||
      initialData?.reason ||
      "Other",

    /*
     * Support both the new field name and
     * a possible misspelled legacy field
     * (releiving_date) coming from the API.
     */
    transfer_apply_date:
      normalizeDate(
        initialData?.transfer_apply_date
      ),

    relieving_date:
      normalizeDate(
        initialData?.relieving_date ??
          initialData?.releiving_date
      ),

    joining_date:
      normalizeDate(
        initialData?.joining_date
      ),

    /*
     * Location is always taken from
     * the transfer record.
     */
    location:
      initialData?.location || "",

    accomplishments:
      initialData?.accomplishments ||
      "",

    is_active:
      initialData?.is_active !== false,
  };
}

/* =========================================================
   FORM
========================================================= */

export default function TransferForm({
  formId = "transfer-form",
  initialData = {},
  onSubmit,
  loading = false,
}) {
  const [employees, setEmployees] =
    useState([]);

  const [departments, setDepartments] =
    useState([]);

  const [companies, setCompanies] =
    useState([]);

  const [branches, setBranches] =
    useState([]);

  const [
    loadingEmployees,
    setLoadingEmployees,
  ] = useState(false);

  const [
    loadingDepartments,
    setLoadingDepartments,
  ] = useState(false);

  const [form, setForm] =
    useState(() => ({
      ...DEFAULT_FORM,
      ...normalizeTransferData(
        initialData
      ),
    }));

  const [error, setError] =
    useState("");

  /* =========================================================
     SYNC EDIT DATA
  ========================================================= */

  useEffect(() => {
    setForm({
      ...DEFAULT_FORM,
      ...normalizeTransferData(
        initialData
      ),
    });

    setError("");
  }, [initialData]);

  /* =========================================================
     LOAD EMPLOYEES
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const loadEmployees =
      async () => {
        try {
          setLoadingEmployees(true);

          const response =
            await employeesApi.list({
              page: 1,
              per_page: 1000,
              is_active: true,
            });

          if (!mounted) {
            return;
          }

          const data =
            response?.data?.data ||
            response?.data ||
            {};

          setEmployees(
            data?.items || []
          );
        } catch (err) {
          console.error(
            "Failed to load employees",
            err
          );
        } finally {
          if (mounted) {
            setLoadingEmployees(false);
          }
        }
      };

    loadEmployees();

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================================================
     LOAD DEPARTMENTS
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const loadDepartments =
      async () => {
        try {
          setLoadingDepartments(true);

          const response =
            await masterApi.listDepartments({
              page: 1,
              per_page: 1000,
            });

          if (!mounted) {
            return;
          }

          const data =
            response?.data?.data ||
            response?.data ||
            {};

          setDepartments(
            data?.items || []
          );
        } catch (err) {
          console.error(
            "Failed to load departments",
            err
          );
        } finally {
          if (mounted) {
            setLoadingDepartments(
              false
            );
          }
        }
      };

    loadDepartments();

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================================================
     LOAD COMPANIES
  ========================================================= */

  const {
    data: companyData,
  } = useCompanies({
    page: 1,
    per_page: 1000,
  });

  useEffect(() => {
    const items =
      companyData?.items ||
      companyData?.data ||
      [];

    setCompanies(items);
  }, [companyData]);

  /* =========================================================
     BRANCHES
  ========================================================= */

  useEffect(() => {
    const map = new Map();

    employees.forEach(
      (employee) => {
        const branch =
          employee?.department?.branch ||
          employee?.branch;

        if (branch?.id) {
          map.set(
            branch.id,
            branch
          );
        }
      }
    );

    companies.forEach(
      (company) => {
        (
          company?.branches || []
        ).forEach((branch) => {
          if (branch?.id) {
            map.set(
              branch.id,
              branch
            );
          }
        });
      }
    );

    setBranches(
      Array.from(map.values())
    );
  }, [
    employees,
    companies,
  ]);

  /* =========================================================
     SELECTED EMPLOYEE
  ========================================================= */

  const selectedEmployee =
    useMemo(
      () =>
        employees.find(
          (employee) =>
            String(employee.id) ===
            String(
              form.employee_id
            )
        ),
      [
        employees,
        form.employee_id,
      ]
    );

  /* =========================================================
     DEPARTMENT OPTIONS
  ========================================================= */

  const departmentOptions =
    useMemo(
      () =>
        departments
          .map((department) => ({
            id: department.id,

            name:
              department.department_name ||
              department.name ||
              `Department #${department.id}`,
          }))
          .sort((a, b) =>
            a.name.localeCompare(
              b.name
            )
          ),
      [departments]
    );

  /* =========================================================
     EMPLOYEE CHANGE
  ========================================================= */

  const handleEmployeeChange =
    (value) => {
      const employee =
        employees.find(
          (item) =>
            String(item.id) ===
            String(value)
        );

      const currentDepartment =
        employee?.department?.id ||
        employee?.department_id ||
        "";

      setForm((current) => ({
        ...current,

        employee_id: value,

        from_department_id:
          currentDepartment ||
          current.from_department_id,
      }));
    };

  /* =========================================================
     CHANGE HANDLER
  ========================================================= */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      setError("");

      if (!form.employee_id) {
        setError(
          "Please select an employee."
        );
        return;
      }

      if (!form.from_department_id) {
        setError(
          "Please select the current department."
        );
        return;
      }

      if (!form.to_department_id) {
        setError(
          "Please select the transfer department."
        );
        return;
      }

      if (
        String(
          form.from_department_id
        ) ===
        String(
          form.to_department_id
        )
      ) {
        setError(
          "Current Department and Transfer Department cannot be the same."
        );
        return;
      }

      if (
        !form.transfer_apply_date
      ) {
        setError(
          "Please select the transfer apply date."
        );
        return;
      }

      if (!form.relieving_date) {
        setError(
          "Please select the relieving date."
        );
        return;
      }

      if (!form.joining_date) {
        setError(
          "Please select the joining date."
        );
        return;
      }

      if (!form.location.trim()) {
        setError(
          "Please enter the transfer location."
        );
        return;
      }

      /*
       * Joining date should not be before
       * relieving date.
       */
      if (
        new Date(
          form.joining_date
        ) <
        new Date(
          form.relieving_date
        )
      ) {
        setError(
          "Joining Date cannot be before Relieving Date."
        );
        return;
      }

      const payload = {
        employee_id: Number(
          form.employee_id
        ),

        from_department_id:
          form.from_department_id
            ? Number(
                form.from_department_id
              )
            : null,

        to_department_id: Number(
          form.to_department_id
        ),

        transfer_reason:
          form.transfer_reason ||
          "Other",

        /*
         * New transfer dates.
         */
        transfer_apply_date:
          normalizeDate(
            form.transfer_apply_date
          ),

        relieving_date:
          normalizeDate(
            form.relieving_date
          ),

        joining_date:
          normalizeDate(
            form.joining_date
          ),

        /*
         * Transfer-specific location.
         */
        location:
          form.location.trim(),

        accomplishments:
          form.accomplishments.trim() ||
          null,

        is_active:
          form.is_active !== false,
      };

      try {
        await onSubmit(payload);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            "Failed to save transfer."
        );
      }
    };

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* =====================================================
          EMPLOYEE
      ===================================================== */}

      <div>
        <label
          htmlFor="employee_id"
          className={labelClass}
        >
          Employee{" "}
          <span className="text-red-500">
            *
          </span>
        </label>

        <select
          id="employee_id"
          name="employee_id"
          value={
            form.employee_id
          }
          onChange={(event) =>
            handleEmployeeChange(
              event.target.value
            )
          }
          disabled={
            loadingEmployees ||
            loading
          }
          className={inputClass}
          required
        >
          <option value="">
            {loadingEmployees
              ? "Loading employees..."
              : "Select Employee"}
          </option>

          {employees.map(
            (employee) => {
              const name =
                `${employee.first_name || ""} ${
                  employee.last_name || ""
                }`.trim();

              return (
                <option
                  key={
                    employee.id
                  }
                  value={
                    employee.id
                  }
                >
                  {name ||
                    `Employee #${employee.id}`}

                  {employee.employee_code
                    ? ` (${employee.employee_code})`
                    : ""}
                </option>
              );
            }
          )}
        </select>
      </div>

      {/* =====================================================
          EMPLOYEE INFORMATION
      ===================================================== */}

      {selectedEmployee && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3 dark:border-slate-700 dark:bg-slate-800/60">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">
              Company
            </p>

            <p className="mt-0.5 text-xs font-medium text-slate-700 dark:text-slate-200">
              {selectedEmployee
                .department?.company
                ?.name ||
                selectedEmployee
                  .company?.name ||
                "—"}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">
              Branch
            </p>

            <p className="mt-0.5 text-xs font-medium text-slate-700 dark:text-slate-200">
              {selectedEmployee
                .department?.branch
                ?.name ||
                selectedEmployee
                  .branch?.name ||
                "—"}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">
              Designation
            </p>

            <p className="mt-0.5 text-xs font-medium text-slate-700 dark:text-slate-200">
              {selectedEmployee
                .designation
                ?.designation_name ||
                selectedEmployee
                  .designation_name ||
                "—"}
            </p>
          </div>
        </div>
      )}

      {/* =====================================================
          DEPARTMENTS
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="from_department_id"
            className={labelClass}
          >
            Current Department{" "}
            <span className="text-red-500">
              *
            </span>
          </label>

          <select
            id="from_department_id"
            name="from_department_id"
            value={
              form.from_department_id
            }
            onChange={
              handleChange
            }
            disabled={loading}
            className={inputClass}
            required
          >
            <option value="">
              Select Current Department
            </option>

            {departmentOptions.map(
              (department) => (
                <option
                  key={
                    department.id
                  }
                  value={
                    department.id
                  }
                >
                  {
                    department.name
                  }
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label
            htmlFor="to_department_id"
            className={labelClass}
          >
            Transfer Department{" "}
            <span className="text-red-500">
              *
            </span>
          </label>

          <select
            id="to_department_id"
            name="to_department_id"
            value={
              form.to_department_id
            }
            onChange={
              handleChange
            }
            disabled={
              loading ||
              loadingDepartments
            }
            className={inputClass}
            required
          >
            <option value="">
              {loadingDepartments
                ? "Loading departments..."
                : "Select Transfer Department"}
            </option>

            {departmentOptions.map(
              (department) => (
                <option
                  key={
                    department.id
                  }
                  value={
                    department.id
                  }
                >
                  {
                    department.name
                  }
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* =====================================================
          REASON + APPLY DATE
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="transfer_reason"
            className={labelClass}
          >
            Transfer Reason
          </label>

          <select
            id="transfer_reason"
            name="transfer_reason"
            value={
              form.transfer_reason
            }
            onChange={
              handleChange
            }
            disabled={loading}
            className={inputClass}
          >
            {COMMON_TRANSFER_REASONS.map(
              (reason) => (
                <option
                  key={reason}
                  value={reason}
                >
                  {reason}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label
            htmlFor="transfer_apply_date"
            className={labelClass}
          >
            Transfer Apply Date{" "}
            <span className="text-red-500">
              *
            </span>
          </label>

          <input
            id="transfer_apply_date"
            name="transfer_apply_date"
            type="date"
            value={
              form.transfer_apply_date
            }
            onChange={
              handleChange
            }
            disabled={loading}
            className={inputClass}
            required
          />
        </div>
      </div>

      {/* =====================================================
          RELIEVING + JOINING DATE
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="relieving_date"
            className={labelClass}
          >
            Relieving Date{" "}
            <span className="text-red-500">
              *
            </span>
          </label>

          <input
            id="relieving_date"
            name="relieving_date"
            type="date"
            value={
              form.relieving_date
            }
            onChange={
              handleChange
            }
            disabled={loading}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label
            htmlFor="joining_date"
            className={labelClass}
          >
            Joining Date{" "}
            <span className="text-red-500">
              *
            </span>
          </label>

          <input
            id="joining_date"
            name="joining_date"
            type="date"
            value={
              form.joining_date
            }
            onChange={
              handleChange
            }
            disabled={loading}
            className={inputClass}
            required
          />
        </div>
      </div>

      {/* =====================================================
          TRANSFER LOCATION
      ===================================================== */}

      <div>
        <label
          htmlFor="location"
          className={labelClass}
        >
          Transfer Location{" "}
          <span className="text-red-500">
            *
          </span>
        </label>

        <input
          id="location"
          name="location"
          type="text"
          value={form.location}
          onChange={
            handleChange
          }
          disabled={loading}
          placeholder="Enter transfer location"
          className={inputClass}
          required
        />

        <p className="mt-1 text-[11px] text-slate-400">
          This location belongs to the transfer
          record and is independent of the
          employee's location.
        </p>
      </div>

      {/* =====================================================
          ACCOMPLISHMENTS
      ===================================================== */}

      <div>
        <label
          htmlFor="accomplishments"
          className={labelClass}
        >
          Overall Records / Accomplishments
        </label>

        <textarea
          id="accomplishments"
          name="accomplishments"
          value={
            form.accomplishments
          }
          onChange={
            handleChange
          }
          disabled={loading}
          rows={4}
          placeholder="Enter overall records / accomplishments"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
      </div>

      {/* =====================================================
          ACTIONS
      ===================================================== */}

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
        <Button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Saving..."
            : initialData?.id
              ? "Update Transfer"
              : "Add Transfer"}
        </Button>
      </div>
    </form>
  );
}