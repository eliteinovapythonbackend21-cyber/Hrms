import { useMemo, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import {
  useHolidays,
  useCreateHoliday,
  useUpdateHoliday,
  useDeactivateHoliday,
  useSyncGovernmentHolidays,
  useUnsyncGovernmentHolidays,
} from "./useHolidays";

import HolidayForm from "./HolidayForm";

import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";

import { usePagination } from "@/hooks/usePagination";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useTableExport } from "@/hooks/useTableExport";
import { useToast } from "@/components/feedback/Toast";

import TableSearchBar from "@/components/table/TableSearchBar";
import TablePagination from "@/components/table/TablePagination";
import TableToolbar from "@/components/table/TableToolbar";

import { holidayApi } from "@/api/master.api";
import { formatDate } from "@/utils/formatDate";
import { useModulePermissions } from "@/hooks/useModulePermissions";


/* ============================================================
   EXPORT COLUMNS
============================================================ */

const EXPORT_COLUMNS = [
  {
    header: "Name",
    accessor: (row) => row.name,
  },
  {
    header: "Date",
    accessor: (row) =>
      formatDate(row.holiday_date),
  },
  {
    header: "Type",
    accessor: (row) =>
      row.holiday_type || "Office",
  },
  {
    header: "Status",
    accessor: (row) =>
      row.is_active
        ? "Active"
        : "Inactive",
  },
];


/* ============================================================
   MONTH NAMES
============================================================ */

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


/* ============================================================
   WEEKDAY LABELS
============================================================ */

const WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];


/* ============================================================
   COUNTRY OPTIONS
============================================================ */

const COUNTRY_OPTIONS = [
  {
    code: "IN",
    label: "India",
  },
  {
    code: "US",
    label: "United States",
  },
  {
    code: "GB",
    label: "United Kingdom",
  },
  {
    code: "AE",
    label: "UAE",
  },
  {
    code: "AU",
    label: "Australia",
  },
  {
    code: "CA",
    label: "Canada",
  },
];


/* ============================================================
   DATE HELPERS
============================================================ */

/*
 * Parse the YYYY-MM-DD portion manually.
 *
 * This avoids browser timezone conversion problems that can
 * happen with:
 *
 * new Date("2026-08-15")
 *
 * especially in non-UTC environments.
 */
function parseHolidayDate(value) {
  if (!value) {
    return null;
  }

  const raw = String(value).slice(0, 10);

  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]) - 1,
    day: Number(match[3]),
  };
}


/* ============================================================
   HOLIDAY DATE KEY
============================================================ */

function holidayDateKey(value) {
  const parsed =
    parseHolidayDate(value);

  if (!parsed) {
    return "";
  }

  return (
    `${parsed.year}-` +
    `${String(parsed.month + 1).padStart(
      2,
      "0"
    )}-` +
    `${String(parsed.day).padStart(
      2,
      "0"
    )}`
  );
}


/* ============================================================
   ISO DATE
============================================================ */

function toISODate(
  year,
  month,
  day
) {
  return (
    `${year}-` +
    `${String(month + 1).padStart(
      2,
      "0"
    )}-` +
    `${String(day).padStart(
      2,
      "0"
    )}`
  );
}


/* ============================================================
   SAME HOLIDAY DATE
============================================================ */

function isSameHolidayDate(
  value,
  year,
  month,
  day
) {
  const parsed =
    parseHolidayDate(value);

  if (!parsed) {
    return false;
  }

  return (
    parsed.year === year &&
    parsed.month === month &&
    parsed.day === day
  );
}


/* ============================================================
   HOLIDAY TYPE
============================================================ */

function getHolidayType(holiday) {
  return (
    holiday?.holiday_type ||
    "Office"
  );
}


/* ============================================================
   PAGE
============================================================ */

export default function HolidayListPage() {
  const { showToast } =
    useToast();

  const queryClient =
    useQueryClient();


  /* ==========================================================
     PAGINATION
  ========================================================== */

  const {
    params,
    page,
    perPage,
    setPage,
    setPerPage,
  } = usePagination();


  /* ==========================================================
     SEARCH
  ========================================================== */

  const {
    value,
    setValue,
    debouncedValue,
  } = useDebouncedSearch();


  /* ==========================================================
     QUERY PARAMS
  ========================================================== */

  const queryParams = {
    ...params,
    search:
      debouncedValue || undefined,
  };


  /* ==========================================================
     PAGINATED HOLIDAY DATA
  ========================================================== */

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useHolidays(
    queryParams
  );


  /* ==========================================================
     PERMISSIONS
  ========================================================== */

  const {
    canAdd,
    canEdit,
    canDelete,
  } =
    useModulePermissions(
      "Holidays"
    );


  /* ==========================================================
     EXPORT
  ========================================================== */

  const {
    exporting,
    exportExcel,
    exportPDF,
  } =
    useTableExport({
      fetchAll:
        holidayApi.list,

      queryParams,

      exportColumns:
        EXPORT_COLUMNS,

      filename:
        "holidays",

      title:
        "Holidays",
    });


  /* ==========================================================
     MUTATIONS
  ========================================================== */

  const createHoliday =
    useCreateHoliday();

  const updateHoliday =
    useUpdateHoliday();

  const deactivateHoliday =
    useDeactivateHoliday();

  const syncGovernmentHolidays =
    useSyncGovernmentHolidays();

  const unsyncGovernmentHolidays =
    useUnsyncGovernmentHolidays();


  /* ==========================================================
     MODAL STATE
  ========================================================== */

  const [
    modalOpen,
    setModalOpen,
  ] = useState(false);

  const [
    editing,
    setEditing,
  ] = useState(null);

  const [
    confirmRow,
    setConfirmRow,
  ] = useState(null);

  const [
    prefillDate,
    setPrefillDate,
  ] = useState(null);


  /* ==========================================================
     UNSYNC CONFIRMATION STATE
  ========================================================== */

  const [
    unsyncConfirmOpen,
    setUnsyncConfirmOpen,
  ] = useState(false);


  /* ==========================================================
     TABLE FILTERS
  ========================================================== */

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("active");

  const [
    typeFilter,
    setTypeFilter,
  ] = useState("all");


  /* ==========================================================
     GOVERNMENT SYNC STATE
  ========================================================== */

  const [
    syncYear,
    setSyncYear,
  ] = useState(
    new Date().getFullYear()
  );

  const [
    syncCountry,
    setSyncCountry,
  ] = useState("IN");


  /* ==========================================================
     VIEW MODE
  ========================================================== */

  const [
    listMode,
    setListMode,
  ] = useState("calendar");


  /* ==========================================================
     FULL HOLIDAY LIST
  ==========================================================
   *
   * Calendar and grouped list need all records rather than
   * only the currently paginated table records.
   *
   * ======================================================== */

  const {
    data: allHolidaysData,
  } = useHolidays({
    page: 1,
    per_page: 1000,
  });


  const holidays =
    data?.items || [];

  const allHolidays =
    allHolidaysData?.items || [];


  /* ==========================================================
     ACTIVE HOLIDAYS
  ========================================================== */

  const allActiveHolidays =
    useMemo(
      () =>
        allHolidays.filter(
          (holiday) =>
            holiday.is_active
        ),
      [allHolidays]
    );


  /* ==========================================================
     INACTIVE HOLIDAYS
  ========================================================== */

  const allInactiveHolidays =
    useMemo(
      () =>
        allHolidays.filter(
          (holiday) =>
            !holiday.is_active
        ),
      [allHolidays]
    );


  /* ==========================================================
     GOVERNMENT HOLIDAYS
  ========================================================== */

  const governmentHolidays =
    useMemo(
      () =>
        allActiveHolidays.filter(
          (holiday) =>
            getHolidayType(
              holiday
            ) === "Government"
        ),
      [allActiveHolidays]
    );


  /* ==========================================================
     OFFICE HOLIDAYS
  ========================================================== */

  const officeHolidays =
    useMemo(
      () =>
        allActiveHolidays.filter(
          (holiday) =>
            getHolidayType(
              holiday
            ) === "Office"
        ),
      [allActiveHolidays]
    );


  /* ==========================================================
     AVAILABLE YEARS
  ========================================================== */

  const currentYear =
    new Date().getFullYear();


  const availableYears =
    useMemo(() => {
      const years =
        new Set();

      allHolidays.forEach(
        (holiday) => {
          const parsed =
            parseHolidayDate(
              holiday.holiday_date
            );

          if (parsed) {
            years.add(
              parsed.year
            );
          }
        }
      );

      years.add(
        currentYear
      );

      return Array.from(
        years
      ).sort(
        (a, b) => b - a
      );
    }, [
      allHolidays,
      currentYear,
    ]);


  /* ==========================================================
     GROUPED LIST YEAR
  ========================================================== */

  const [
    listYear,
    setListYear,
  ] = useState(
    currentYear
  );


  /* ==========================================================
     GROUPED BY MONTH
  ========================================================== */

  const groupedByMonth =
    useMemo(() => {
      const buckets =
        Array.from(
          {
            length: 12,
          },
          () => ({
            government: [],
            office: [],
          })
        );


      allActiveHolidays.forEach(
        (holiday) => {
          const parsed =
            parseHolidayDate(
              holiday.holiday_date
            );

          if (!parsed) {
            return;
          }

          if (
            parsed.year !==
            Number(listYear)
          ) {
            return;
          }

          if (
            getHolidayType(
              holiday
            ) === "Government"
          ) {
            buckets[
              parsed.month
            ].government.push(
              holiday
            );
          } else {
            buckets[
              parsed.month
            ].office.push(
              holiday
            );
          }
        }
      );


      buckets.forEach(
        (bucket) => {
          bucket.government.sort(
            (a, b) =>
              holidayDateKey(
                a.holiday_date
              ).localeCompare(
                holidayDateKey(
                  b.holiday_date
                )
              )
          );

          bucket.office.sort(
            (a, b) =>
              holidayDateKey(
                a.holiday_date
              ).localeCompare(
                holidayDateKey(
                  b.holiday_date
                )
              )
          );
        }
      );


      return buckets;
    }, [
      allActiveHolidays,
      listYear,
    ]);


  /* ==========================================================
     YEAR TOTALS
  ========================================================== */

  const yearTotals =
    useMemo(
      () =>
        groupedByMonth.reduce(
          (
            totals,
            bucket
          ) => ({
            government:
              totals.government +
              bucket.government.length,

            office:
              totals.office +
              bucket.office.length,
          }),
          {
            government: 0,
            office: 0,
          }
        ),
      [groupedByMonth]
    );


  /* ==========================================================
     CALENDAR STATE
  ========================================================== */

  const today =
    new Date();

  const [
    calendarYear,
    setCalendarYear,
  ] = useState(
    today.getFullYear()
  );

  const [
    calendarMonth,
    setCalendarMonth,
  ] = useState(
    today.getMonth()
  );


  /* ==========================================================
     CALENDAR MONTH HOLIDAYS
  ========================================================== */

  const calendarHolidaysThisMonth =
    useMemo(
      () =>
        allActiveHolidays
          .filter(
            (holiday) => {
              const parsed =
                parseHolidayDate(
                  holiday.holiday_date
                );

              if (!parsed) {
                return false;
              }

              return (
                parsed.year ===
                  calendarYear &&
                parsed.month ===
                  calendarMonth
              );
            }
          )
          .sort(
            (a, b) =>
              holidayDateKey(
                a.holiday_date
              ).localeCompare(
                holidayDateKey(
                  b.holiday_date
                )
              )
          ),
      [
        allActiveHolidays,
        calendarYear,
        calendarMonth,
      ]
    );


  /* ==========================================================
     CALENDAR CELLS
  ========================================================== */

  const calendarCells =
    useMemo(() => {
      const firstOfMonth =
        new Date(
          calendarYear,
          calendarMonth,
          1
        );

      const startWeekday =
        firstOfMonth.getDay();

      const daysInMonth =
        new Date(
          calendarYear,
          calendarMonth + 1,
          0
        ).getDate();

      const cells = [];


      for (
        let i = 0;
        i < startWeekday;
        i += 1
      ) {
        cells.push(null);
      }


      for (
        let day = 1;
        day <= daysInMonth;
        day += 1
      ) {
        const savedForDay =
          calendarHolidaysThisMonth.filter(
            (holiday) =>
              isSameHolidayDate(
                holiday.holiday_date,
                calendarYear,
                calendarMonth,
                day
              )
          );

        cells.push({
          day,
          saved: savedForDay,
        });
      }


      return cells;
    }, [
      calendarYear,
      calendarMonth,
      calendarHolidaysThisMonth,
    ]);


  /* ==========================================================
     PREVIOUS MONTH
  ========================================================== */

  const goToPrevMonth =
    () => {
      if (
        calendarMonth ===
        0
      ) {
        setCalendarMonth(
          11
        );

        setCalendarYear(
          (year) =>
            year - 1
        );
      } else {
        setCalendarMonth(
          (month) =>
            month - 1
        );
      }
    };


  /* ==========================================================
     NEXT MONTH
  ========================================================== */

  const goToNextMonth =
    () => {
      if (
        calendarMonth ===
        11
      ) {
        setCalendarMonth(
          0
        );

        setCalendarYear(
          (year) =>
            year + 1
        );
      } else {
        setCalendarMonth(
          (month) =>
            month + 1
        );
      }
    };


  /* ==========================================================
     GO TO TODAY
  ========================================================== */

  const goToToday =
    () => {
      const now =
        new Date();

      setCalendarYear(
        now.getFullYear()
      );

      setCalendarMonth(
        now.getMonth()
      );
    };


  /* ==========================================================
     TODAY CHECK
  ========================================================== */

  const isToday =
    (day) =>
      day ===
        today.getDate() &&
      calendarMonth ===
        today.getMonth() &&
      calendarYear ===
        today.getFullYear();


  /* ==========================================================
     CALENDAR DATE CLICK
  ========================================================== */

  const handleCellClick =
    (cell) => {
      if (
        !cell ||
        !canAdd
      ) {
        return;
      }

      /*
       * Prevent duplicate holidays.
       */
      if (
        cell.saved.length >
        0
      ) {
        return;
      }

      setPrefillDate(
        toISODate(
          calendarYear,
          calendarMonth,
          cell.day
        )
      );

      setEditing(null);
      setModalOpen(true);
    };


  /* ==========================================================
     TABLE FILTER
  ========================================================== */

  const filteredHolidays =
    holidays.filter(
      (holiday) => {
        if (
          statusFilter ===
            "active" &&
          !holiday.is_active
        ) {
          return false;
        }

        if (
          statusFilter ===
            "inactive" &&
          holiday.is_active
        ) {
          return false;
        }

        if (
          typeFilter !==
            "all" &&
          getHolidayType(
            holiday
          ) !== typeFilter
        ) {
          return false;
        }

        return true;
      }
    );


  /* ==========================================================
     ADD HOLIDAY
  ========================================================== */

  const openAdd =
    () => {
      setEditing(null);
      setPrefillDate(null);
      setModalOpen(true);
    };


  /* ==========================================================
     EDIT HOLIDAY
  ========================================================== */

  const openEdit =
    (holiday) => {
      setEditing(
        holiday
      );

      setPrefillDate(null);
      setModalOpen(true);
    };


  /* ==========================================================
     SUBMIT HOLIDAY
  ========================================================== */

  const handleSubmit =
    async (
      payload
    ) => {
      try {
        if (editing) {
          await updateHoliday.mutateAsync(
            {
              id:
                editing.id,
              payload,
            }
          );

          showToast(
            "Holiday updated successfully",
            "success"
          );
        } else {
          await createHoliday.mutateAsync(
            payload
          );

          showToast(
            "Holiday created successfully",
            "success"
          );
        }


        setModalOpen(false);
        setEditing(null);
        setPrefillDate(null);


        await queryClient.invalidateQueries(
          {
            queryKey:
              ["holidays"],
          }
        );

      } catch (error) {
        showToast(
          error?.response?.data
            ?.message ||
            "Operation failed",
          "error"
        );
      }
    };


  /* ==========================================================
     DEACTIVATE HOLIDAY
  ========================================================== */

  const handleDeactivate =
    async () => {
      if (!confirmRow) {
        return;
      }

      try {
        await deactivateHoliday.mutateAsync(
          confirmRow.id
        );

        showToast(
          "Holiday deactivated successfully",
          "success"
        );

        setConfirmRow(
          null
        );

        await queryClient.invalidateQueries(
          {
            queryKey:
              ["holidays"],
          }
        );
      } catch (error) {
        showToast(
          error?.response?.data
            ?.message ||
            "Operation failed",
          "error"
        );
      }
    };


  /* ==========================================================
     SYNC GOVERNMENT HOLIDAYS
  ========================================================== */

  const handleSyncGovernmentHolidays =
    async () => {
      try {
        const result =
          await syncGovernmentHolidays.mutateAsync(
            {
              year:
                syncYear,

              countryCode:
                syncCountry,
            }
          );

        showToast(
          result?.message ||
            "Government holidays synchronized",
          "success"
        );


        setListYear(
          syncYear
        );

        setCalendarYear(
          syncYear
        );

        /*
         * Start at January after synchronizing the selected
         * year. Change to syncYear's current month if you prefer.
         */
        setCalendarMonth(
          0
        );


        await queryClient.invalidateQueries(
          {
            queryKey:
              ["holidays"],
          }
        );


        await refetch();

      } catch (error) {
        showToast(
          error?.response?.data
            ?.message ||
            "Failed to sync government holidays",
          "error"
        );
      }
    };


  /* ==========================================================
     UNSYNC GOVERNMENT HOLIDAYS
  ========================================================== */

  const handleUnsyncGovernmentHolidays =
    async () => {
      try {
        const result =
          await unsyncGovernmentHolidays.mutateAsync(
            {
              year:
                syncYear,

              countryCode:
                syncCountry,
            }
          );

        showToast(
          result?.message ||
            "Government holidays unsynced successfully",
          "success"
        );


        setUnsyncConfirmOpen(
          false
        );


        setListYear(
          syncYear
        );

        setCalendarYear(
          syncYear
        );

        setCalendarMonth(
          0
        );


        await queryClient.invalidateQueries(
          {
            queryKey:
              ["holidays"],
          }
        );


        await refetch();

      } catch (error) {
        showToast(
          error?.response?.data
            ?.message ||
            "Failed to unsync government holidays",
          "error"
        );
      }
    };


  /* ==========================================================
     TABLE COLUMNS
  ========================================================== */

  const columns = [
    {
      key: "name",
      label: "Holiday",

      render: (row) => {
        const firstLetter =
          row.name
            ?.charAt(0)
            ?.toUpperCase() ||
          "H";

        return (
          <div className="flex min-w-0 items-center gap-2">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">

              <span className="text-sm font-bold">
                {firstLetter}
              </span>

            </div>


            <div className="min-w-0">

              <p className="truncate font-semibold text-slate-800 dark:text-white">
                {row.name || "-"}
              </p>

            </div>

          </div>
        );
      },
    },

    {
      key:
        "holiday_date",

      label:
        "Date",

      render:
        (row) => (
          <span className="block truncate text-sm font-medium text-slate-600 dark:text-slate-300">
            {formatDate(
              row.holiday_date
            )}
          </span>
        ),
    },

    {
      key:
        "holiday_type",

      label:
        "Type",

      render:
        (row) => {
          const type =
            getHolidayType(
              row
            );

          const isGovernment =
            type ===
            "Government";

          return (
            <Badge
              className={
                isGovernment
                  ? "inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                  : "inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
              }
            >
              {type}
            </Badge>
          );
        },
    },

    {
      key:
        "status",

      label:
        "Status",

      render:
        (row) => (
          <Badge
            className={
              row.is_active
                ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300"
            }
          >

            <span
              className={
                row.is_active
                  ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
                  : "h-1.5 w-1.5 rounded-full bg-red-500"
              }
            />

            {row.is_active
              ? "Active"
              : "Inactive"}

          </Badge>
        ),
    },

    {
      key:
        "actions",

      label:
        "Actions",

      render:
        (row) => (
          <div className="flex items-center gap-1.5 whitespace-nowrap">

            {canEdit && (
              <button
                type="button"
                onClick={() =>
                  openEdit(row)
                }
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-primary-600 transition hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-800 dark:text-primary-400 dark:hover:bg-primary-500/10"
              >
                Edit
              </button>
            )}


            {row.is_active &&
              canDelete && (
                <button
                  type="button"
                  onClick={() =>
                    setConfirmRow(
                      row
                    )
                  }
                  className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  Deactivate
                </button>
              )}

          </div>
        ),
    },
  ];


  /* ==========================================================
     RETURN
  ========================================================== */

  return (
    <div className="space-y-5">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

        <div>

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
              <span className="font-bold">
                H
              </span>
            </div>

            <div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Holidays
              </h1>

              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Manage government and office holidays
              </p>

            </div>

          </div>

        </div>


        <div className="flex flex-wrap items-center gap-2">

          <TableToolbar
            onRefresh={
              refetch
            }
            refreshing={
              isFetching
            }
            onExportExcel={
              exportExcel
            }
            onExportPDF={
              exportPDF
            }
            exporting={
              exporting
            }
          />


          {canAdd && (
            <Button
              onClick={
                openAdd
              }
              className="h-10 w-full px-4 sm:w-auto"
            >
              <span className="mr-1.5 text-lg">
                +
              </span>

              Add Holiday
            </Button>
          )}

        </div>

      </div>


      {/* ======================================================
          GOVERNMENT HOLIDAY SYNC / UNSYNC
      ====================================================== */}

      <div className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm dark:border-violet-900/30 dark:bg-slate-900">

        <div className="flex flex-col gap-4">

          <div>

            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
              Government Holiday Synchronization
            </h3>

            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Sync or remove Government holidays for the selected year and country.
            </p>

          </div>


          <div className="flex flex-wrap items-center gap-2">

            {/* YEAR */}

            <input
              type="number"
              min="1900"
              max="2100"
              value={
                syncYear
              }
              onChange={(
                event
              ) =>
                setSyncYear(
                  Number(
                    event.target.value
                  )
                )
              }
              className="h-10 w-28 rounded-lg border border-slate-300 bg-white px-2 text-sm outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />


            {/* COUNTRY */}

            <select
              value={
                syncCountry
              }
              onChange={(
                event
              ) =>
                setSyncCountry(
                  event.target.value
                )
              }
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >

              {COUNTRY_OPTIONS.map(
                (country) => (
                  <option
                    key={
                      country.code
                    }
                    value={
                      country.code
                    }
                  >
                    {
                      country.label
                    }
                  </option>
                )
              )}

            </select>


            {/* SYNC */}

            <Button
              type="button"
              variant="secondary"
              onClick={
                handleSyncGovernmentHolidays
              }
              disabled={
                syncGovernmentHolidays.isPending ||
                unsyncGovernmentHolidays.isPending
              }
              className="h-10 px-4"
            >
              {
                syncGovernmentHolidays.isPending
                  ? "Synchronizing..."
                  : "Sync Government Holidays"
              }
            </Button>


            {/* UNSYNC */}

            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setUnsyncConfirmOpen(
                  true
                )
              }
              disabled={
                unsyncGovernmentHolidays.isPending ||
                syncGovernmentHolidays.isPending
              }
              className="h-10 border-red-200 px-4 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              {
                unsyncGovernmentHolidays.isPending
                  ? "Unsyncing..."
                  : "Unsync Government Holidays"
              }
            </Button>

          </div>

        </div>

      </div>


      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

        {/* TOTAL */}

        <div className="h-[110px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">

          <div className="flex h-full items-center justify-between">

            <div>

              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Holidays
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {
                  allHolidays.length
                }
              </p>

              <p className="text-[11px] text-slate-400">
                All saved records
              </p>

            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              H
            </div>

          </div>

        </div>


        {/* GOVERNMENT */}

        <div className="h-[110px] rounded-xl border border-violet-100 bg-white px-4 py-3 shadow-sm dark:border-violet-900/30 dark:bg-slate-900">

          <div className="flex h-full items-center justify-between">

            <div>

              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Government Holidays
              </p>

              <p className="mt-1 text-2xl font-bold text-violet-600 dark:text-violet-400">
                {
                  governmentHolidays.length
                }
              </p>

              <p className="text-[11px] text-slate-400">
                Active
              </p>

            </div>

            <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />

          </div>

        </div>


        {/* OFFICE */}

        <div className="h-[110px] rounded-xl border border-sky-100 bg-white px-4 py-3 shadow-sm dark:border-sky-900/30 dark:bg-slate-900">

          <div className="flex h-full items-center justify-between">

            <div>

              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Office Holidays
              </p>

              <p className="mt-1 text-2xl font-bold text-sky-600 dark:text-sky-400">
                {
                  officeHolidays.length
                }
              </p>

              <p className="text-[11px] text-slate-400">
                Active
              </p>

            </div>

            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />

          </div>

        </div>


        {/* INACTIVE */}

        <div className="h-[110px] rounded-xl border border-red-100 bg-white px-4 py-3 shadow-sm dark:border-red-900/30 dark:bg-slate-900">

          <div className="flex h-full items-center justify-between">

            <div>

              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Inactive Holidays
              </p>

              <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
                {
                  allInactiveHolidays.length
                }
              </p>

              <p className="text-[11px] text-slate-400">
                Deactivated
              </p>

            </div>

            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />

          </div>

        </div>

      </div>


      {/* ======================================================
          VIEW SWITCH
      ====================================================== */}

      <div className="flex justify-end">

        <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">

          <button
            type="button"
            onClick={() =>
              setListMode(
                "calendar"
              )
            }
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              listMode ===
              "calendar"
                ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            Calendar
          </button>


          <button
            type="button"
            onClick={() =>
              setListMode(
                "grouped"
              )
            }
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              listMode ===
              "grouped"
                ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            Year / Month List
          </button>

        </div>

      </div>


      {/* ======================================================
          CALENDAR
      ====================================================== */}

      {listMode ===
        "calendar" && (

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">

          {/* CALENDAR HEADER */}

          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex flex-wrap items-center gap-2">

              <button
                type="button"
                onClick={
                  goToPrevMonth
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                ‹
              </button>


              <h2 className="min-w-[180px] text-center text-sm font-semibold text-slate-800 dark:text-white">
                {
                  MONTH_NAMES[
                    calendarMonth
                  ]
                }{" "}
                {
                  calendarYear
                }
              </h2>


              <button
                type="button"
                onClick={
                  goToNextMonth
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                ›
              </button>


              <button
                type="button"
                onClick={
                  goToToday
                }
                className="ml-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Today
              </button>

            </div>


            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">

              <span className="flex items-center gap-1">

                <span className="h-2 w-2 rounded-full bg-violet-500" />

                Government

              </span>


              <span className="flex items-center gap-1">

                <span className="h-2 w-2 rounded-full bg-sky-500" />

                Office

              </span>


              <span>
                {
                  calendarHolidaysThisMonth.length
                }{" "}
                holiday
                {
                  calendarHolidaysThisMonth.length ===
                  1
                    ? ""
                    : "s"
                }{" "}
                this month
              </span>

            </div>

          </div>


          {/* CALENDAR BODY */}

          <div className="p-4">

            <div className="grid grid-cols-7 gap-1.5">

              {/* WEEKDAYS */}

              {WEEKDAY_LABELS.map(
                (label) => (
                  <div
                    key={label}
                    className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {label}
                  </div>
                )
              )}


              {/* DAYS */}

              {calendarCells.map(
                (
                  cell,
                  index
                ) => {

                  if (!cell) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="min-h-[100px]"
                      />
                    );
                  }


                  const hasAny =
                    cell.saved
                      .length >
                    0;


                  const cellDate =
                    toISODate(
                      calendarYear,
                      calendarMonth,
                      cell.day
                    );


                  return (
                    <div
                      key={`${calendarYear}-${calendarMonth}-${cell.day}`}
                      onClick={() =>
                        handleCellClick(
                          cell
                        )
                      }
                      className={`group/day relative flex min-h-[100px] flex-col gap-1 rounded-lg border p-1.5 transition ${
                        isToday(
                          cell.day
                        )
                          ? "border-primary-400 bg-primary-50 dark:border-primary-500 dark:bg-primary-500/10"
                          : hasAny
                          ? "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/60"
                          : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      } ${
                        canAdd &&
                        !hasAny
                          ? "cursor-pointer"
                          : ""
                      }`}
                    >

                      {/* ==================================================
                          HOVER TOOLTIP
                      ================================================== */}

                      <div className="pointer-events-none absolute left-1/2 top-1 z-50 hidden w-[260px] -translate-x-1/2 -translate-y-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-left shadow-xl group-hover/day:block">

                        <div className="mb-2 text-[11px] font-semibold text-white">
                          {
                            formatDate(
                              cellDate
                            )
                          }
                        </div>


                        {cell.saved
                          .length ===
                        0 ? (

                          <div className="text-[10px] text-slate-400">
                            No holiday
                          </div>

                        ) : (

                          <div className="space-y-2">

                            {cell.saved.map(
                              (
                                holiday
                              ) => (

                                <div
                                  key={
                                    holiday.id
                                  }
                                  className="rounded-lg bg-white/5 p-2"
                                >

                                  <div className="flex items-start gap-2">

                                    <span
                                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                                        getHolidayType(
                                          holiday
                                        ) ===
                                        "Government"
                                          ? "bg-violet-400"
                                          : "bg-sky-400"
                                      }`}
                                    />

                                    <div className="min-w-0">

                                      <p className="text-[11px] font-semibold text-white">
                                        {
                                          holiday.name
                                        }
                                      </p>

                                      <p className="mt-0.5 text-[9px] text-slate-400">
                                        {
                                          getHolidayType(
                                            holiday
                                          )
                                        }{" "}
                                        Holiday
                                      </p>

                                    </div>

                                  </div>

                                </div>

                              )
                            )}

                          </div>

                        )}

                      </div>


                      {/* DATE NUMBER */}

                      <span
                        className={`text-xs font-semibold ${
                          isToday(
                            cell.day
                          )
                            ? "text-primary-700 dark:text-primary-400"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {
                          cell.day
                        }
                      </span>


                      {/* HOLIDAY PILLS */}

                      {hasAny && (

                        <div className="flex flex-1 flex-col gap-1 overflow-hidden">

                          {cell.saved.map(
                            (
                              holiday
                            ) => {

                              const isGovernment =
                                getHolidayType(
                                  holiday
                                ) ===
                                "Government";


                              return (
                                <button
                                  key={
                                    holiday.id
                                  }
                                  type="button"
                                  onClick={(
                                    event
                                  ) => {

                                    event.stopPropagation();

                                    if (
                                      canEdit
                                    ) {
                                      openEdit(
                                        holiday
                                      );
                                    }

                                  }}
                                  className={`w-full truncate rounded px-1.5 py-1 text-left text-[10px] font-medium leading-tight ${
                                    isGovernment
                                      ? "bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-500/15 dark:text-violet-300 dark:hover:bg-violet-500/25"
                                      : "bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-500/15 dark:text-sky-300 dark:hover:bg-sky-500/25"
                                  } ${
                                    canEdit
                                      ? "cursor-pointer"
                                      : "cursor-default"
                                  }`}
                                >
                                  {
                                    holiday.name
                                  }
                                </button>
                              );

                            }
                          )}

                        </div>
                      )}

                    </div>
                  );
                }
              )}

            </div>


            {/* EMPTY MONTH */}

            {calendarHolidaysThisMonth.length ===
              0 && (

              <p className="mt-3 text-center text-xs text-slate-400">

                No holidays recorded for{" "}

                {
                  MONTH_NAMES[
                    calendarMonth
                  ]
                }{" "}

                {
                  calendarYear
                }.

                {canAdd &&
                  " Click an empty date to add a holiday."}

              </p>

            )}

          </div>

        </div>

      )}


      {/* ======================================================
          YEAR / MONTH LIST
      ====================================================== */}

      {listMode ===
        "grouped" && (

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">

          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-sm font-semibold text-slate-800 dark:text-white">
                Holiday List —{" "}
                {
                  listYear
                }
              </h2>

              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">

                {
                  yearTotals.government
                }{" "}
                Government

                {" · "}

                {
                  yearTotals.office
                }{" "}
                Office

              </p>

            </div>


            <select
              value={
                listYear
              }
              onChange={(
                event
              ) =>
                setListYear(
                  Number(
                    event.target.value
                  )
                )
              }
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white sm:w-32"
            >

              {availableYears.map(
                (year) => (
                  <option
                    key={year}
                    value={year}
                  >
                    {
                      year
                    }
                  </option>
                )
              )}

            </select>

          </div>


          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">

            {MONTH_NAMES.map(
              (
                monthName,
                monthIndex
              ) => {

                const bucket =
                  groupedByMonth[
                    monthIndex
                  ];


                const monthHolidays = [
                  ...bucket.government,
                  ...bucket.office,
                ];


                if (
                  monthHolidays.length ===
                  0
                ) {
                  return null;
                }


                return (
                  <div
                    key={
                      monthName
                    }
                    className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                  >

                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {
                        monthName
                      }
                    </h3>


                    <div className="space-y-2">

                      {monthHolidays.map(
                        (
                          holiday
                        ) => {

                          const isGovernment =
                            getHolidayType(
                              holiday
                            ) ===
                            "Government";


                          const parsed =
                            parseHolidayDate(
                              holiday.holiday_date
                            );


                          return (
                            <button
                              key={
                                holiday.id
                              }
                              type="button"
                              onClick={() =>
                                canEdit &&
                                openEdit(
                                  holiday
                                )
                              }
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white dark:hover:bg-slate-800"
                            >

                              <Badge
                                className={
                                  isGovernment
                                    ? "shrink-0 rounded-full bg-violet-50 px-1.5 py-0.5 text-[9px] text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                                    : "shrink-0 rounded-full bg-sky-50 px-1.5 py-0.5 text-[9px] text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
                                }
                              >
                                {
                                  isGovernment
                                    ? "Gov"
                                    : "Off"
                                }
                              </Badge>


                              <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
                                {
                                  holiday.name
                                }
                              </span>


                              <span className="shrink-0 text-xs text-slate-400">
                                {
                                  parsed?.day ||
                                  "-"
                                }
                              </span>

                            </button>
                          );
                        }
                      )}

                    </div>

                  </div>
                );
              }
            )}


            {yearTotals.government ===
              0 &&
              yearTotals.office ===
                0 && (

              <div className="col-span-full py-8 text-center text-sm text-slate-400">
                No active holidays recorded for{" "}
                {
                  listYear
                }.
              </div>

            )}

          </div>

        </div>

      )}


      {/* ======================================================
          TABLE
      ====================================================== */}

      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">

        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

            {/* SEARCH */}

            <div className="w-full lg:max-w-sm">

              <TableSearchBar
                value={value}
                onChange={(
                  newValue
                ) => {
                  setValue(
                    newValue
                  );

                  setPage(1);
                }}
                placeholder="Search holidays..."
              />

            </div>


            {/* FILTERS */}

            <div className="flex flex-wrap items-center gap-2">

              {/* TYPE FILTER */}

              <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">

                {[
                  {
                    value:
                      "all",
                    label:
                      "All Types",
                  },
                  {
                    value:
                      "Government",
                    label:
                      "Government",
                  },
                  {
                    value:
                      "Office",
                    label:
                      "Office",
                  },
                ].map(
                  (
                    filter
                  ) => (
                    <button
                      key={
                        filter.value
                      }
                      type="button"
                      onClick={() =>
                        setTypeFilter(
                          filter.value
                        )
                      }
                      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                        typeFilter ===
                        filter.value
                          ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {
                        filter.label
                      }
                    </button>
                  )
                )}

              </div>


              {/* STATUS FILTER */}

              <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">

                {[
                  {
                    value:
                      "active",
                    label:
                      "Active",
                  },
                  {
                    value:
                      "inactive",
                    label:
                      "Inactive",
                  },
                  {
                    value:
                      "all",
                    label:
                      "All",
                  },
                ].map(
                  (
                    filter
                  ) => (
                    <button
                      key={
                        filter.value
                      }
                      type="button"
                      onClick={() =>
                        setStatusFilter(
                          filter.value
                        )
                      }
                      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                        statusFilter ===
                        filter.value
                          ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {
                        filter.label
                      }
                    </button>
                  )
                )}

              </div>

            </div>

          </div>

        </div>


        {/* ERROR */}

        {isError && (

          <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-400">

            <p className="font-medium">
              Failed to load holidays.
            </p>

            <p className="mt-1 text-xs opacity-80">
              Please refresh the page and try again.
            </p>

          </div>

        )}


        {/* TABLE */}

        {!isError && (

          <DataTable
            columns={
              columns
            }
            data={
              filteredHolidays
            }
            loading={
              isLoading
            }
          />

        )}


        {/* EMPTY */}

        {!isLoading &&
          !isError &&
          filteredHolidays.length ===
            0 && (

          <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-10 text-center">

            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">

              <span className="text-xl font-bold text-slate-400">
                H
              </span>

            </div>


            <h3 className="mt-4 text-sm font-semibold text-slate-800 dark:text-white">
              No holidays found
            </h3>


            <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              No holidays match your current filters.
            </p>


            {canAdd && (

              <Button
                onClick={
                  openAdd
                }
                className="mt-4 h-9 px-4 text-sm"
              >
                + Add Holiday
              </Button>

            )}

          </div>

        )}


        {/* PAGINATION */}

        <div className="border-t border-slate-200 px-2 dark:border-slate-700">

          <TablePagination
            page={
              page
            }
            pages={
              data?.pages ||
              1
            }
            total={
              data?.total ||
              0
            }
            perPage={
              perPage
            }
            onPageChange={
              setPage
            }
            onPerPageChange={(
              value
            ) => {

              setPerPage(
                value
              );

              setPage(1);

            }}
          />

        </div>

      </div>


      {/* ======================================================
          ADD / EDIT MODAL
      ====================================================== */}

      <Modal
        open={
          modalOpen
        }
        onClose={() => {

          setModalOpen(
            false
          );

          setEditing(
            null
          );

          setPrefillDate(
            null
          );

        }}
        title={
          editing
            ? "Edit Holiday"
            : "Add Holiday"
        }
      >

        <HolidayForm
          initialData={
            editing ||
            (
              prefillDate
                ? {
                    holiday_date:
                      prefillDate,
                  }
                : {}
            )
          }
          onSubmit={
            handleSubmit
          }
          loading={
            createHoliday.isPending ||
            updateHoliday.isPending
          }
          onCancel={() => {

            setModalOpen(
              false
            );

            setEditing(
              null
            );

            setPrefillDate(
              null
            );

          }}
          isEdit={
            !!editing
          }
        />

      </Modal>


      {/* ======================================================
          SINGLE HOLIDAY DEACTIVATE
      ====================================================== */}

      <ConfirmDialog
        open={
          !!confirmRow
        }
        onClose={() =>
          setConfirmRow(
            null
          )
        }
        onConfirm={
          handleDeactivate
        }
        title="Deactivate Holiday"
        message="Are you sure you want to deactivate this holiday?"
        confirmText="Deactivate"
        loading={
          deactivateHoliday.isPending
        }
      />


      {/* ======================================================
          GOVERNMENT HOLIDAY UNSYNC
      ====================================================== */}

      <ConfirmDialog
        open={
          unsyncConfirmOpen
        }
        onClose={() =>
          setUnsyncConfirmOpen(
            false
          )
        }
        onConfirm={
          handleUnsyncGovernmentHolidays
        }
        title="Unsync Government Holidays"
        message={
          `Are you sure you want to remove all Government holidays for ${syncYear}? This will remove the saved Government holiday records for the selected year.`
        }
        confirmText="Unsync Holidays"
        loading={
          unsyncGovernmentHolidays.isPending
        }
      />

    </div>
  );
}