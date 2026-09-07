import { useMemo, useState } from "react";

import {
  OFFICE_EXPENSE_CATEGORIES,
  OFFICE_EXPENSE_PURCHASE_TYPES,
  useEmployeeExpenses,
  useEmployeeExpenseReport,
  useCreateEmployeeExpense,
  useUpdateEmployeeExpense,
  useDeactivateEmployeeExpense,
} from "./useEmployeeExpenses";

import EmployeeExpenseForm from "./EmployeeExpenseForm";

import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import TableToolbar from "@/components/table/TableToolbar";

import { useToast } from "@/components/feedback/Toast";
import { getUser } from "@/utils/tokenHelpers";
import { isAdmin as checkIsAdmin } from "@/constants/roles";
import { useIsFinanceEmployee } from "@/hooks/useIsFinanceEmployee";
import { resolveUploadUrl } from "@/utils/fileUrl";
import { formatDate } from "@/utils/formatDate";


const VIEW_TABS = [
  {
    id: "day",
    label: "Day-to-Day",
  },
  {
    id: "weekly",
    label: "Weekly",
  },
  {
    id: "monthly",
    label: "Monthly",
  },
  {
    id: "quarterly",
    label: "Quarterly",
  },
  {
    id: "received",
    label: "Received",
  },
];


const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];


function getTodayString() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function getCurrentYear() {
  return new Date().getFullYear();
}


function getCurrentQuarter() {
  return (
    Math.floor(
      new Date().getMonth() / 3
    ) + 1
  );
}


function getQuarterStartDate(
  year,
  quarter
) {
  const month =
    (Number(quarter) - 1) * 3 + 1;

  return `${year}-${String(month).padStart(
    2,
    "0"
  )}-01`;
}


function getYearStart(year) {
  return `${year}-01-01`;
}


function getYearEnd(year) {
  return `${year}-12-31`;
}


function formatAmount(value) {
  return `₹${Number(
    value || 0
  ).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}


function getEmployeeName(row) {
  return (
    [
      row.employee?.first_name,
      row.employee?.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    row.employee?.employee_code ||
    "-"
  );
}


function StatCard({
  label,
  value,
  description,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>

      {description && (
        <p className="mt-1 text-[11px] text-slate-400">
          {description}
        </p>
      )}
    </div>
  );
}


function CollectionBadge({ row }) {
  const collected =
    row.collection_status ===
    "Collected";

  return (
    <div>
      <Badge
        className={
          collected
            ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
            : "inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
        }
      >
        {collected
          ? "Collected"
          : "Not Collected"}
      </Badge>

      {row.collection_mode && (
        <p className="mt-1 text-[10px] text-slate-400">
          {row.collection_mode}
        </p>
      )}

      {row.collection_date && (
        <p className="mt-0.5 text-[10px] text-slate-400">
          {formatDate(
            row.collection_date
          )}
        </p>
      )}
    </div>
  );
}


function ExpenseTable({
  rows,
  loading,
  canManageAll,
  onEdit,
  onDeactivate,
}) {
  const columns = useMemo(
    () => [
      {
        key: "purchase_type",
        label: "Purchase Type",

        render: (row) => (
          <Badge className="inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs text-primary-700 dark:bg-primary-500/10 dark:text-primary-400">
            {row.purchase_type || "-"}
          </Badge>
        ),
      },

      {
        key: "item_name",
        label: "Item",

        render: (row) => (
          <div className="min-w-[170px]">
            <p className="font-semibold text-slate-800 dark:text-white">
              {row.item_name || "-"}
            </p>

            <p className="mt-0.5 text-[11px] text-slate-400">
              {row.category || "-"}
            </p>
          </div>
        ),
      },

      {
        key: "amount",
        label: "Amount",

        render: (row) => (
          <span className="font-semibold text-slate-800 dark:text-white">
            {formatAmount(row.amount)}
          </span>
        ),
      },

      {
        key: "purchased_by",
        label: "Purchased By",

        render: (row) => (
          <span className="text-sm text-slate-700 dark:text-slate-200">
            {row.purchased_by || "-"}
          </span>
        ),
      },

      {
        key: "purchased_from",
        label: "Purchased From",

        render: (row) => (
          <span className="max-w-[180px] truncate text-sm text-slate-600 dark:text-slate-300">
            {row.purchased_from || "-"}
          </span>
        ),
      },

      {
        key: "expense_date",
        label: "Expense Date",

        render: (row) => (
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {formatDate(row.expense_date)}
          </span>
        ),
      },

      ...(canManageAll
        ? [
            {
              key: "employee",
              label: "Employee",

              render: (row) => (
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  {getEmployeeName(row)}
                </span>
              ),
            },
          ]
        : []),

      {
        key: "collection",
        label: "Collection",

        render: (row) => (
          <CollectionBadge row={row} />
        ),
      },

      {
        key: "receipt",
        label: "Receipt",

        render: (row) =>
          row.receipt_url ? (
            <a
              href={resolveUploadUrl(
                row.receipt_url
              )}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
            >
              View
            </a>
          ) : (
            <span className="text-xs text-slate-400">
              -
            </span>
          ),
      },

      {
        key: "actions",
        label: "Actions",

        render: (row) => (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <button
              type="button"
              onClick={() =>
                onEdit(row)
              }
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-primary-600 transition hover:bg-primary-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-primary-400"
            >
              Edit
            </button>

            {row.is_active && (
              <button
                type="button"
                onClick={() =>
                  onDeactivate(row)
                }
                className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:bg-white/[0.06] dark:text-red-400"
              >
                Deactivate
              </button>
            )}
          </div>
        ),
      },
    ],
    [
      canManageAll,
      onEdit,
      onDeactivate,
    ]
  );


  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
      />
    </div>
  );
}


function ReportTransactionTable({
  rows,
}) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400 dark:border-white/10 dark:bg-white/[0.04]">
        No expense details found for this period.
      </div>
    );
  }


  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <h2 className="font-semibold text-slate-800 dark:text-white">
          Expense Details
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                Date
              </th>

              <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                Item
              </th>

              <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                Purchased By
              </th>

              <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                Purchased From
              </th>

              <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                Amount
              </th>

              <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                Collection
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {formatDate(
                    row.expense_date
                  )}
                </td>

                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-800 dark:text-white">
                    {row.item_name || "-"}
                  </p>

                  <p className="text-[11px] text-slate-400">
                    {row.category || "-"}
                  </p>
                </td>

                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {row.purchased_by || "-"}
                </td>

                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {row.purchased_from || "-"}
                </td>

                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">
                  {formatAmount(row.amount)}
                </td>

                <td className="px-4 py-3">
                  <CollectionBadge row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function PeriodSummary({
  title,
  rows,
  emptyMessage,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-white/10">
        <h2 className="font-semibold text-slate-800 dark:text-white">
          {title}
        </h2>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-white/5">
        {rows.length ? (
          rows.map((row) => (
            <div
              key={row.key}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-800 dark:text-white">
                  {row.label}
                </p>

                {row.subtitle && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    {row.subtitle}
                  </p>
                )}

                <p className="mt-1 text-xs text-slate-400">
                  {row.entries} expense
                  {row.entries !== 1
                    ? "s"
                    : ""}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 text-right">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">
                    Total
                  </p>

                  <p className="font-bold text-slate-800 dark:text-white">
                    {formatAmount(
                      row.amount
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wide text-emerald-500">
                    Collected
                  </p>

                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatAmount(
                      row.collectedAmount
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wide text-amber-500">
                    Pending
                  </p>

                  <p className="font-semibold text-amber-600 dark:text-amber-400">
                    {formatAmount(
                      row.pendingAmount
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}


export default function EmployeeExpenseListPage() {
  const { showToast } = useToast();

  const user = getUser();

  const isAdmin = checkIsAdmin(user);

  const { isFinanceEmployee } =
    useIsFinanceEmployee();

  const canManageAll =
    isAdmin || isFinanceEmployee;


  const [activeView, setActiveView] =
    useState("day");

  const [selectedDate, setSelectedDate] =
    useState(getTodayString());

  const [selectedYear, setSelectedYear] =
    useState(getCurrentYear());

  const [selectedQuarter, setSelectedQuarter] =
    useState(getCurrentQuarter());


  const [categoryFilter, setCategoryFilter] =
    useState("");

  const [purchaseTypeFilter, setPurchaseTypeFilter] =
    useState("");

  const [collectionStatusFilter, setCollectionStatusFilter] =
    useState("");


  const [modalOpen, setModalOpen] =
    useState(false);

  const [editing, setEditing] =
    useState(null);

  const [confirmRow, setConfirmRow] =
    useState(null);


  const isDayView =
    activeView === "day";

  const isReceivedView =
    activeView === "received";

  const isMonthlyView =
    activeView === "monthly";


  const listParams = useMemo(() => {
    const params = {
      per_page: 2000,
      is_active: true,

      category:
        categoryFilter || undefined,

      purchase_type:
        purchaseTypeFilter || undefined,
    };


    if (isDayView) {
      params.from_date =
        selectedDate;

      params.to_date =
        selectedDate;

      if (collectionStatusFilter) {
        params.collection_status =
          collectionStatusFilter;
      }
    }


    if (isReceivedView) {
      params.collection_status =
        "Collected";
    }


    if (isMonthlyView) {
      params.from_date =
        getYearStart(selectedYear);

      params.to_date =
        getYearEnd(selectedYear);

      if (collectionStatusFilter) {
        params.collection_status =
          collectionStatusFilter;
      }
    }


    return params;
  }, [
    isDayView,
    isReceivedView,
    isMonthlyView,
    selectedDate,
    selectedYear,
    categoryFilter,
    purchaseTypeFilter,
    collectionStatusFilter,
  ]);


  const listEnabled =
    isDayView ||
    isReceivedView ||
    isMonthlyView;


  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useEmployeeExpenses(
    listParams,
    {
      enabled: listEnabled,
    }
  );


  const reportDate =
    activeView === "weekly"
      ? selectedDate
      : activeView === "quarterly"
      ? getQuarterStartDate(
          selectedYear,
          selectedQuarter
        )
      : selectedDate;


  const reportPeriod =
    activeView === "weekly"
      ? "weekly"
      : activeView === "quarterly"
      ? "quarterly"
      : null;


  const {
    data: reportData,
    isLoading: reportLoading,
    isFetching: reportFetching,
  } = useEmployeeExpenseReport(
    reportPeriod,
    reportDate,
    {
      category:
        categoryFilter || undefined,

      purchase_type:
        purchaseTypeFilter || undefined,
    },
    {
      enabled:
        Boolean(reportPeriod) &&
        Boolean(reportDate),
    }
  );


  const createExpense =
    useCreateEmployeeExpense();

  const updateExpense =
    useUpdateEmployeeExpense();

  const deactivateExpense =
    useDeactivateEmployeeExpense();


  const expenses =
    data?.items || [];


  const totalAmount = expenses.reduce(
    (sum, row) =>
      sum + Number(row.amount || 0),
    0
  );


  const collectedAmount =
    expenses.reduce(
      (sum, row) =>
        row.collection_status ===
        "Collected"
          ? sum + Number(row.amount || 0)
          : sum,
      0
    );


  const pendingAmount =
    totalAmount -
    collectedAmount;


  const monthlyRows = useMemo(() => {
    const rows = MONTH_NAMES.map(
      (month, index) => ({
        key: month,

        label: month,

        subtitle:
          `${selectedYear}`,

        entries: 0,

        amount: 0,

        collectedAmount: 0,

        pendingAmount: 0,

        expenses: [],
      })
    );


    expenses.forEach((expense) => {
      if (!expense.expense_date) {
        return;
      }

      const monthIndex =
        Number(
          expense.expense_date.split(
            "-"
          )[1]
        ) - 1;


      if (
        monthIndex < 0 ||
        monthIndex > 11
      ) {
        return;
      }


      const row =
        rows[monthIndex];


      const amount =
        Number(
          expense.amount || 0
        );


      row.entries += 1;

      row.amount += amount;

      if (
        expense.collection_status ===
        "Collected"
      ) {
        row.collectedAmount +=
          amount;
      } else {
        row.pendingAmount +=
          amount;
      }

      row.expenses.push(
        expense
      );
    });


    return rows;
  }, [
    expenses,
    selectedYear,
  ]);


  const monthlyCollected =
    monthlyRows.reduce(
      (sum, row) =>
        sum + row.collectedAmount,
      0
    );


  const monthlyTotal =
    monthlyRows.reduce(
      (sum, row) =>
        sum + row.amount,
      0
    );


  const monthlyPending =
    monthlyTotal -
    monthlyCollected;


  const reportSummaryRows =
    useMemo(() => {
      if (!reportData) {
        return [];
      }


      if (
        activeView ===
        "weekly"
      ) {
        return (
          reportData.days || []
        ).map((row) => ({
          key: row.date,

          label:
            row.day || "Day",

          subtitle:
            row.date
              ? formatDate(
                  row.date
                )
              : "",

          entries:
            Number(
              row.entries || 0
            ),

          amount:
            Number(
              row.amount || 0
            ),

          collectedAmount:
            Number(
              row.collected_amount ||
                0
            ),

          pendingAmount:
            Number(
              row.pending_amount ||
                0
            ),
        }));
      }


      if (
        activeView ===
        "quarterly"
      ) {
        return (
          reportData.months ||
          []
        ).map((row) => ({
          key: row.month,

          label:
            row.month ||
            "Month",

          subtitle:
            `${selectedYear}`,

          entries:
            Number(
              row.entries || 0
            ),

          amount:
            Number(
              row.amount || 0
            ),

          collectedAmount:
            Number(
              row.collected_amount ||
                0
            ),

          pendingAmount:
            Number(
              row.pending_amount ||
                0
            ),
        }));
      }


      return [];
    }, [
      activeView,
      reportData,
      selectedYear,
    ]);


  const reportTransactions =
    useMemo(() => {
      if (!reportData) {
        return [];
      }


      const groups =
        activeView === "weekly"
          ? reportData.days || []
          : activeView ===
              "quarterly"
          ? reportData.months || []
          : [];


      return groups.flatMap(
        (group) =>
          group.expenses || []
      );
    }, [
      activeView,
      reportData,
    ]);


  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };


  const openEdit = (row) => {
    setEditing(row);
    setModalOpen(true);
  };


  const handleSubmit = async (
    payload
  ) => {
    try {
      if (editing) {
        await updateExpense.mutateAsync(
          {
            id: editing.id,
            payload,
          }
        );

        showToast(
          "Office expense updated successfully.",
          "success"
        );
      } else {
        await createExpense.mutateAsync(
          payload
        );

        showToast(
          "Office expense recorded successfully.",
          "success"
        );
      }


      setModalOpen(false);
      setEditing(null);
    } catch (error) {
      showToast(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save office expense.",
        "error"
      );
    }
  };


  const handleDeactivate =
    async () => {
      if (!confirmRow) {
        return;
      }


      try {
        await deactivateExpense.mutateAsync(
          confirmRow.id
        );

        showToast(
          "Office expense deactivated.",
          "success"
        );

        setConfirmRow(null);
      } catch (error) {
        showToast(
          error?.response?.data?.message ||
            "Operation failed.",
          "error"
        );
      }
    };


  const resetReportFilters = () => {
    setCategoryFilter("");
    setPurchaseTypeFilter("");
    setCollectionStatusFilter("");
  };


  return (
    <div className="min-w-0 space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.04] xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Office Expenses
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage office purchases, expenses, collections and period-wise reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar
            onRefresh={
              activeView === "weekly" ||
              activeView === "quarterly"
                ? undefined
                : refetch
            }
            refreshing={
              activeView === "weekly" ||
              activeView === "quarterly"
                ? reportFetching
                : isFetching
            }
          />

          <Button
            type="button"
            onClick={openAdd}
            className="h-10 px-4"
          >
            <span className="mr-1.5 text-lg leading-none">
              +
            </span>

            Add Office Expense
          </Button>
        </div>
      </div>


      {/* Main tabs */}
      <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {VIEW_TABS.map(
            (tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveView(
                    tab.id
                  )
                }
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  activeView ===
                  tab.id
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
                }`}
              >
                {tab.label}
              </button>
            )
          )}
        </div>
      </div>


      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-wrap items-end gap-3">

          {activeView === "day" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Date
              </label>

              <input
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  setSelectedDate(
                    event.target.value
                  )
                }
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
              />
            </div>
          )}


          {activeView === "weekly" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Week Starting Date
              </label>

              <input
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  setSelectedDate(
                    event.target.value
                  )
                }
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
              />
            </div>
          )}


          {(activeView === "monthly" ||
            activeView === "quarterly") && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Year
              </label>

              <input
                type="number"
                min="2000"
                max="2100"
                value={selectedYear}
                onChange={(event) =>
                  setSelectedYear(
                    Number(
                      event.target.value
                    )
                  )
                }
                className="h-10 w-28 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
              />
            </div>
          )}


          {activeView === "quarterly" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Quarter
              </label>

              <select
                value={selectedQuarter}
                onChange={(event) =>
                  setSelectedQuarter(
                    Number(
                      event.target.value
                    )
                  )
                }
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
              >
                <option value={1}>
                  Q1 — Jan to Mar
                </option>

                <option value={2}>
                  Q2 — Apr to Jun
                </option>

                <option value={3}>
                  Q3 — Jul to Sep
                </option>

                <option value={4}>
                  Q4 — Oct to Dec
                </option>
              </select>
            </div>
          )}


          {(activeView === "day" ||
            activeView === "monthly" ||
            activeView === "received") && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Purchase Type
                </label>

                <select
                  value={
                    purchaseTypeFilter
                  }
                  onChange={(event) =>
                    setPurchaseTypeFilter(
                      event.target.value
                    )
                  }
                  className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
                >
                  <option value="">
                    All Purchase Types
                  </option>

                  {OFFICE_EXPENSE_PURCHASE_TYPES.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    )
                  )}
                </select>
              </div>


              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Category
                </label>

                <select
                  value={
                    categoryFilter
                  }
                  onChange={(event) =>
                    setCategoryFilter(
                      event.target.value
                    )
                  }
                  className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
                >
                  <option value="">
                    All Categories
                  </option>

                  {OFFICE_EXPENSE_CATEGORIES.map(
                    (category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>
                    )
                  )}
                </select>
              </div>
            </>
          )}


          {(activeView === "day" ||
            activeView === "monthly") && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Collection
              </label>

              <select
                value={
                  collectionStatusFilter
                }
                onChange={(event) =>
                  setCollectionStatusFilter(
                    event.target.value
                  )
                }
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
              >
                <option value="">
                  All
                </option>

                <option value="Collected">
                  Collected
                </option>

                <option value="Not Collected">
                  Not Collected
                </option>
              </select>
            </div>
          )}


          <button
            type="button"
            onClick={resetReportFilters}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"
          >
            Reset Filters
          </button>
        </div>
      </div>


      {/* Day-to-Day */}
      {activeView === "day" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Total Entries"
              value={expenses.length}
              description="Expenses for selected date"
            />

            <StatCard
              label="Total Amount"
              value={formatAmount(
                totalAmount
              )}
            />

            <StatCard
              label="Pending Collection"
              value={formatAmount(
                pendingAmount
              )}
            />
          </div>


          <ExpenseTable
            rows={expenses}
            loading={isLoading}
            canManageAll={canManageAll}
            onEdit={openEdit}
            onDeactivate={setConfirmRow}
          />
        </>
      )}


      {/* Received */}
      {activeView === "received" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Received Entries"
              value={expenses.length}
              description="Collected office expenses"
            />

            <StatCard
              label="Received Amount"
              value={formatAmount(
                totalAmount
              )}
            />

            <StatCard
              label="Collection Mode"
              value={
                new Set(
                  expenses
                    .map(
                      (item) =>
                        item.collection_mode
                    )
                    .filter(Boolean)
                ).size
              }
              description="Different collection modes"
            />
          </div>


          <ExpenseTable
            rows={expenses}
            loading={isLoading}
            canManageAll={canManageAll}
            onEdit={openEdit}
            onDeactivate={setConfirmRow}
          />
        </>
      )}


      {/* Monthly */}
      {activeView === "monthly" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label={`${selectedYear} Total`}
              value={formatAmount(
                monthlyTotal
              )}
              description="January to December"
            />

            <StatCard
              label="Collected"
              value={formatAmount(
                monthlyCollected
              )}
            />

            <StatCard
              label="Pending"
              value={formatAmount(
                monthlyPending
              )}
            />
          </div>


          <PeriodSummary
            title={`Monthly Office Expense Summary — ${selectedYear}`}
            rows={monthlyRows}
            emptyMessage="No monthly expense data available."
          />


          <ReportTransactionTable
            rows={expenses}
          />
        </>
      )}


      {/* Weekly */}
      {activeView === "weekly" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Weekly Total"
              value={formatAmount(
                reportData?.total_amount
              )}
              description="Monday to Sunday"
            />

            <StatCard
              label="Collected"
              value={formatAmount(
                reportData?.collected_amount
              )}
            />

            <StatCard
              label="Pending"
              value={formatAmount(
                reportData?.pending_amount
              )}
            />
          </div>


          <PeriodSummary
            title="Weekly Expense Details"
            rows={reportSummaryRows}
            emptyMessage={
              reportLoading
                ? "Loading weekly report..."
                : "No weekly expense data available."
            }
          />


          <ReportTransactionTable
            rows={reportTransactions}
          />
        </>
      )}


      {/* Quarterly */}
      {activeView === "quarterly" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label={`Q${selectedQuarter} Total`}
              value={formatAmount(
                reportData?.total_amount
              )}
              description={`${selectedYear}`}
            />

            <StatCard
              label="Collected"
              value={formatAmount(
                reportData?.collected_amount
              )}
            />

            <StatCard
              label="Pending"
              value={formatAmount(
                reportData?.pending_amount
              )}
            />
          </div>


          <PeriodSummary
            title={`Quarterly Expense Details — Q${selectedQuarter} ${selectedYear}`}
            rows={reportSummaryRows}
            emptyMessage={
              reportLoading
                ? "Loading quarterly report..."
                : "No quarterly expense data available."
            }
          />


          <ReportTransactionTable
            rows={reportTransactions}
          />
        </>
      )}


      {/* Add/Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={
          editing
            ? "Edit Office Expense"
            : "Add Office Expense"
        }
      >
        <EmployeeExpenseForm
          key={
            editing?.id ??
            "new-office-expense"
          }
          initialData={
            editing || {}
          }
          onSubmit={handleSubmit}
          loading={
            createExpense.isPending ||
            updateExpense.isPending
          }
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          isEdit={Boolean(editing)}
          canPickEmployee={
            canManageAll
          }
        />
      </Modal>


      {/* Deactivate confirmation */}
      <ConfirmDialog
        open={Boolean(confirmRow)}
        onClose={() =>
          setConfirmRow(null)
        }
        onConfirm={
          handleDeactivate
        }
        title="Deactivate Office Expense"
        message="Are you sure you want to deactivate this office expense?"
        confirmText="Deactivate"
        loading={
          deactivateExpense.isPending
        }
      />
    </div>
  );
}
