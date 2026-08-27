import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  useHolidays,
  useCreateHoliday,
  useUpdateHoliday,
  useDeactivateHoliday,
  useSyncGovernmentHolidays,
  useUnsyncGovernmentHolidays,
  useSyncOfficeSundays,
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


function holidayDateKey(value) {
  const parsed =
    parseHolidayDate(value);

  if (!parsed) {
    return "";
  }

  return (
    `${parsed.year}-` +
    `${String(
      parsed.month + 1
    ).padStart(2, "0")}-` +
    `${String(
      parsed.day
    ).padStart(2, "0")}`
  );
}


function toISODate(
  year,
  month,
  day
) {
  return (
    `${year}-` +
    `${String(
      month + 1
    ).padStart(2, "0")}-` +
    `${String(day).padStart(
      2,
      "0"
    )}`
  );
}


function getHolidayType(holiday) {
  return (
    holiday?.holiday_type ||
    "Office"
  );
}


function getCalendarDateKey(
  year,
  month,
  day
) {
  return toISODate(
    year,
    month,
    day
  );
}


/* ============================================================
   DETAIL ROW
============================================================ */

function DetailRow({
  label,
  value,
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>

      <span className="truncate text-[10px] font-semibold text-slate-700 dark:text-slate-200">
        {value}
      </span>
    </div>
  );
}


/* ============================================================
   HOLIDAY DETAIL CARD
============================================================ */

function HolidayDetailCard({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
        {value}
      </p>
    </div>
  );
}


/* ============================================================
   CALENDAR LEGEND
============================================================ */

function CalendarLegend({
  label,
  tone,
}) {
  const styles = {
    violet:
      "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",

    sky:
      "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  };

  const dots = {
    violet: "bg-violet-500",
    sky: "bg-sky-500",
  };

  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold ${styles[tone]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`}
      />

      {label}
    </span>
  );
}


/* ============================================================
   SUMMARY CARD
============================================================ */

function SummaryCard({
  label,
  value,
  description,
  tone,
  icon,
}) {
  const styles = {
    primary: {
      border:
        "border-slate-200 dark:border-slate-700",
      icon:
        "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400",
      value:
        "text-slate-900 dark:text-white",
    },

    violet: {
      border:
        "border-violet-100 dark:border-violet-900/30",
      icon:
        "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
      value:
        "text-violet-600 dark:text-violet-400",
    },

    sky: {
      border:
        "border-sky-100 dark:border-sky-900/30",
      icon:
        "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
      value:
        "text-sky-600 dark:text-sky-400",
    },

    red: {
      border:
        "border-red-100 dark:border-red-900/30",
      icon:
        "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
      value:
        "text-red-600 dark:text-red-400",
    },
  };

  const current =
    styles[tone] ||
    styles.primary;

  return (
    <div
      className={`h-[100px] rounded-xl border bg-white px-3 py-2.5 shadow-sm transition hover:shadow-md dark:bg-slate-900 ${current.border}`}
    >
      <div className="flex h-full items-center justify-between gap-2">

        <div className="min-w-0">

          <p className="truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p
            className={`mt-1 text-xl font-bold ${current.value}`}
          >
            {value}
          </p>

          <p className="truncate text-[9px] text-slate-400">
            {description}
          </p>

        </div>

        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${current.icon}`}
        >
          {icon}
        </div>

      </div>
    </div>
  );
}


/* ============================================================
   MAIN PAGE
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
     TABLE FILTERS
     (declared before queryParams so they can be included below)
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
     QUERY PARAMS
     NOTE: holiday_type / is_active are now sent to the backend
     as real filters (see organization.py filter_fields), instead
     of being applied only client-side after the page was fetched.
  ========================================================== */

  const queryParams = {
    ...params,
    search:
      debouncedValue ||
      undefined,
    holiday_type:
      typeFilter !== "all"
        ? typeFilter
        : undefined,
    is_active:
      statusFilter === "all"
        ? undefined
        : statusFilter === "active"
        ? "true"
        : "false",
  };


  /* ==========================================================
     PAGINATED HOLIDAYS
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

  const syncOfficeSundays =
    useSyncOfficeSundays();


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

  const [
    unsyncConfirmOpen,
    setUnsyncConfirmOpen,
  ] = useState(false);


  /* ==========================================================
     HOLIDAY DETAILS STATE
  ========================================================== */

  const [
    holidayDetailsOpen,
    setHolidayDetailsOpen,
  ] = useState(false);

  const [
    selectedHoliday,
    setSelectedHoliday,
  ] = useState(null);


  /* ==========================================================
     GOVERNMENT SYNC
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
     OFFICE SUNDAY SYNC
  ========================================================== */

  const [
    sundayStartYear,
    setSundayStartYear,
  ] = useState(
    new Date().getFullYear()
  );

  const [
    sundayEndYear,
    setSundayEndYear,
  ] = useState(
    new Date().getFullYear()
  );


  /* ==========================================================
     VIEW MODE
  ========================================================== */

  const [
    listMode,
    setListMode,
  ] = useState("calendar");


  /* ==========================================================
     ALL HOLIDAYS
  ========================================================== */

  const {
    data:
      allHolidaysData,
  } = useHolidays({
    page: 1,
    per_page: 1000,
  });


  const holidays =
    data?.items || [];

  const allHolidays =
    allHolidaysData?.items ||
    [];


  /* ==========================================================
     ACTIVE / INACTIVE
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
     CURRENT YEAR
  ========================================================== */

  const currentYear =
    new Date().getFullYear();


  /* ==========================================================
     LIST YEAR
  ========================================================== */

  const [
    listYear,
    setListYear,
  ] = useState(
    currentYear
  );


  /* ==========================================================
     AVAILABLE YEARS
  ========================================================== */

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

      years.add(
        Number(syncYear)
      );

      years.add(
        Number(sundayStartYear)
      );

      years.add(
        Number(sundayEndYear)
      );

      years.add(
        Number(listYear)
      );

      return Array.from(
        years
      ).sort(
        (a, b) =>
          b - a
      );
    }, [
      allHolidays,
      currentYear,
      syncYear,
      sundayStartYear,
      sundayEndYear,
      listYear,
    ]);


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
     HOLIDAYS BY DATE
  ========================================================== */

  const holidaysByDate =
    useMemo(() => {
      const map =
        new Map();

      allActiveHolidays.forEach(
        (holiday) => {
          const key =
            holidayDateKey(
              holiday.holiday_date
            );

          if (!key) {
            return;
          }

          if (!map.has(key)) {
            map.set(
              key,
              []
            );
          }

          map.get(key).push(
            holiday
          );
        }
      );

      map.forEach(
        (items) => {
          items.sort(
            (a, b) =>
              String(
                a.name || ""
              ).localeCompare(
                String(
                  b.name || ""
                )
              )
          );
        }
      );

      return map;
    }, [
      allActiveHolidays,
    ]);


  /* ==========================================================
     CURRENT MONTH HOLIDAYS
  ========================================================== */

  const calendarHolidaysThisMonth =
    useMemo(
      () =>
        allActiveHolidays.filter(
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

      const previousMonthDays =
        new Date(
          calendarYear,
          calendarMonth,
          0
        ).getDate();

      const cells = [];


      /* PREVIOUS MONTH */

      for (
        let index =
          startWeekday - 1;
        index >= 0;
        index -= 1
      ) {
        const day =
          previousMonthDays -
          index;

        const date =
          new Date(
            calendarYear,
            calendarMonth - 1,
            day
          );

        const year =
          date.getFullYear();

        const month =
          date.getMonth();

        const key =
          getCalendarDateKey(
            year,
            month,
            day
          );

        cells.push({
          day,
          year,
          month,
          key,
          isCurrentMonth:
            false,
          holidays:
            holidaysByDate.get(
              key
            ) || [],
        });
      }


      /* CURRENT MONTH */

      for (
        let day = 1;
        day <= daysInMonth;
        day += 1
      ) {
        const key =
          getCalendarDateKey(
            calendarYear,
            calendarMonth,
            day
          );

        cells.push({
          day,
          year:
            calendarYear,
          month:
            calendarMonth,
          key,
          isCurrentMonth:
            true,
          holidays:
            holidaysByDate.get(
              key
            ) || [],
        });
      }


      /* NEXT MONTH */

      let nextDay = 1;

      while (
        cells.length < 42
      ) {
        const date =
          new Date(
            calendarYear,
            calendarMonth + 1,
            nextDay
          );

        const year =
          date.getFullYear();

        const month =
          date.getMonth();

        const key =
          getCalendarDateKey(
            year,
            month,
            nextDay
          );

        cells.push({
          day:
            nextDay,
          year,
          month,
          key,
          isCurrentMonth:
            false,
          holidays:
            holidaysByDate.get(
              key
            ) || [],
        });

        nextDay += 1;
      }

      return cells;
    }, [
      calendarYear,
      calendarMonth,
      holidaysByDate,
    ]);


  /* ==========================================================
     CALENDAR NAVIGATION
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


  const handleCalendarMonthChange =
    (event) => {
      setCalendarMonth(
        Number(
          event.target.value
        )
      );
    };


  const handleCalendarYearChange =
    (event) => {
      setCalendarYear(
        Number(
          event.target.value
        )
      );
    };


  /* ==========================================================
     TODAY CHECK
  ========================================================== */

  const isTodayDate =
    (
      year,
      month,
      day
    ) =>
      year ===
        today.getFullYear() &&
      month ===
        today.getMonth() &&
      day ===
        today.getDate();


  /* ==========================================================
     CALENDAR CELL CLICK
  ========================================================== */

  const handleCalendarCellClick =
    (cell) => {

      if (
        !cell.isCurrentMonth
      ) {
        setCalendarYear(
          cell.year
        );

        setCalendarMonth(
          cell.month
        );

        return;
      }


      if (
        cell.holidays.length >
        0
      ) {
        return;
      }


      if (!canAdd) {
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
      if (!holiday) {
        return;
      }

      setEditing(
        holiday
      );

      setPrefillDate(null);
      setModalOpen(true);
    };


  /* ==========================================================
     HOLIDAY DETAILS
  ========================================================== */

  const openHolidayDetails =
    (holiday) => {
      if (!holiday) {
        return;
      }

      setSelectedHoliday(
        holiday
      );

      setHolidayDetailsOpen(
        true
      );
    };


  /* ==========================================================
     FILTERED HOLIDAYS
     Kept as a client-side safety net now that the backend also
     filters by holiday_type / is_active. If the API params ever
     get dropped upstream, the table still shows correct rows for
     whatever page was returned.
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
     SUBMIT
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


        setModalOpen(
          false
        );

        setEditing(
          null
        );

        setPrefillDate(
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
     DEACTIVATE
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
          result?.data?.message ||
            result?.message ||
            "Government holidays synchronized",
          "success"
        );


        setCalendarYear(
          Number(syncYear)
        );

        setCalendarMonth(
          0
        );

        setListYear(
          Number(syncYear)
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
          result?.data?.message ||
            result?.message ||
            "Government holidays unsynced successfully",
          "success"
        );


        setUnsyncConfirmOpen(
          false
        );


        setCalendarYear(
          Number(syncYear)
        );

        setCalendarMonth(
          0
        );

        setListYear(
          Number(syncYear)
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
     SYNC OFFICE SUNDAYS
  ========================================================== */

  const handleSyncOfficeSundays =
    async () => {

      try {

        const startYear =
          Number(
            sundayStartYear
          );

        const endYear =
          Number(
            sundayEndYear
          );


        if (
          !startYear ||
          !endYear
        ) {

          showToast(
            "Please select a valid year range",
            "error"
          );

          return;
        }


        if (
          endYear <
          startYear
        ) {

          showToast(
            "End year cannot be smaller than start year",
            "error"
          );

          return;
        }


        const result =
          await syncOfficeSundays.mutateAsync(
            {
              startYear,
              endYear,
            }
          );


        showToast(
          result?.data?.message ||
            result?.message ||
            "Office Sundays synchronized successfully",
          "success"
        );


        setCalendarYear(
          startYear
        );

        setCalendarMonth(
          0
        );

        setListYear(
          startYear
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
            "Failed to synchronize Office Sundays",
          "error"
        );

      }
    };


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
     TABLE COLUMNS
  ========================================================== */

  const columns = [
    {
      key:
        "name",

      label:
        "Holiday",

      className:
        "w-[34%]",

      headerClassName:
        "w-[34%]",

      cellClassName:
        "w-[34%]",

      render:
        (row) => {

          const firstLetter =
            row.name
              ?.charAt(0)
              ?.toUpperCase() ||
            "H";


          const isGovernment =
            getHolidayType(
              row
            ) ===
            "Government";


          return (
            <div className="group relative flex min-w-0 items-center gap-3">

              {/* ICON */}

              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                  isGovernment
                    ? "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
                    : "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"
                }`}
              >
                {firstLetter}
              </div>


              {/* NAME */}

              <button
                type="button"
                onClick={() =>
                  openHolidayDetails(
                    row
                  )
                }
                className="min-w-0 flex-1 text-left"
              >

                <p className="truncate text-sm font-semibold text-slate-800 underline decoration-transparent underline-offset-2 transition hover:text-primary-600 hover:decoration-primary-400 dark:text-white dark:hover:text-primary-400">
                  {
                    row.name ||
                    "-"
                  }
                </p>


                <p className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-slate-400">

                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      isGovernment
                        ? "bg-violet-500"
                        : "bg-sky-500"
                    }`}
                  />

                  <span className="truncate">

                    {isGovernment
                      ? "Government Holiday"
                      : "Office Holiday"}

                  </span>

                </p>

              </button>


              {/* TABLE HOVER DETAILS */}

              <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 hidden w-[280px] rounded-xl border border-slate-200 bg-white p-3 text-left shadow-2xl group-hover:block dark:border-slate-700 dark:bg-slate-900">

                <div className="absolute -bottom-1.5 left-8 h-3 w-3 rotate-45 border-b border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />


                <div className="relative">

                  <div className="flex items-start gap-2">

                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        isGovernment
                          ? "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
                          : "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"
                      }`}
                    >
                      {
                        firstLetter
                      }
                    </div>


                    <div className="min-w-0 flex-1">

                      <p className="truncate text-xs font-bold text-slate-800 dark:text-white">
                        {
                          row.name ||
                          "-"
                        }
                      </p>

                      <p className="mt-0.5 text-[9px] text-slate-400">
                        Holiday Details
                      </p>

                    </div>

                  </div>


                  <div className="mt-3 space-y-2">

                    <DetailRow
                      label="Date"
                      value={
                        row.holiday_date
                          ? formatDate(
                              row.holiday_date
                            )
                          : "-"
                      }
                    />

                    <DetailRow
                      label="Type"
                      value={
                        getHolidayType(
                          row
                        )
                      }
                    />

                    <DetailRow
                      label="Status"
                      value={
                        row.is_active
                          ? "Active"
                          : "Inactive"
                      }
                    />

                  </div>


                  <div className="mt-3 border-t border-slate-100 pt-2 text-[9px] font-medium text-primary-600 dark:border-slate-800 dark:text-primary-400">
                    Click holiday name to view full details
                  </div>

                </div>

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

      className:
        "w-[15%] whitespace-nowrap",

      headerClassName:
        "w-[15%]",

      cellClassName:
        "w-[15%] whitespace-nowrap",

      render:
        (row) => (
          <span className="block truncate text-sm font-medium text-slate-600 dark:text-slate-300">
            {
              formatDate(
                row.holiday_date
              )
            }
          </span>
        ),
    },


    {
      key:
        "holiday_type",

      label:
        "Type",

      className:
        "w-[15%]",

      headerClassName:
        "w-[15%]",

      cellClassName:
        "w-[15%]",

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
                  ? "inline-flex whitespace-nowrap items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                  : "inline-flex whitespace-nowrap items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
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

      className:
        "w-[14%]",

      headerClassName:
        "w-[14%]",

      cellClassName:
        "w-[14%]",

      render:
        (row) => (
          <Badge
            className={
              row.is_active
                ? "inline-flex whitespace-nowrap items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "inline-flex whitespace-nowrap items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300"
            }
          >

            <span
              className={
                row.is_active
                  ? "h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                  : "h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"
              }
            />

            {
              row.is_active
                ? "Active"
                : "Inactive"
            }

          </Badge>
        ),
    },


    {
      key:
        "actions",

      label:
        "Actions",

      className:
        "w-[22%]",

      headerClassName:
        "w-[22%]",

      cellClassName:
        "w-[22%]",

      render:
        (row) => (
          <div className="flex items-center justify-start gap-1.5 whitespace-nowrap">

            {canEdit && (
              <button
                type="button"
                onClick={() =>
                  openEdit(
                    row
                  )
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
              className="h-10 px-4"
            >
              <span className="mr-1 text-lg">
                +
              </span>

              Add Holiday
            </Button>
          )}

        </div>

      </div>


      {/* ======================================================
          SYNCHRONIZATION CARD
      ====================================================== */}

      <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50/80 via-white to-indigo-50/60 p-4 shadow-sm dark:border-violet-900/30 dark:from-violet-950/30 dark:via-slate-900 dark:to-indigo-950/20">

        {/* ====================================================
            GOVERNMENT SYNC
        ==================================================== */}

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">

          <div>

            <div className="flex items-center gap-2">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                G
              </div>

              <div>

                <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                  Government Holiday Synchronization
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sync or remove Government holidays for the selected year.
                </p>

              </div>

            </div>

          </div>


          <div className="flex flex-wrap items-center gap-2">

            <input
              type="number"
              min="1900"
              max="2100"
              value={
                syncYear
              }
              onChange={(event) =>
                setSyncYear(
                  Number(
                    event.target.value
                  )
                )
              }
              className="h-9 w-24 rounded-lg border border-slate-300 bg-white px-2 text-xs outline-none focus:border-violet-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />


            <select
              value={
                syncCountry
              }
              onChange={(event) =>
                setSyncCountry(
                  event.target.value
                )
              }
              className="h-9 w-36 rounded-lg border border-slate-300 bg-white px-2 text-xs outline-none focus:border-violet-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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


            <Button
              type="button"
              variant="secondary"
              onClick={
                handleSyncGovernmentHolidays
              }
              disabled={
                syncGovernmentHolidays.isPending ||
                unsyncGovernmentHolidays.isPending ||
                syncOfficeSundays.isPending
              }
              className="h-9 px-3 text-xs"
            >
              {
                syncGovernmentHolidays.isPending
                  ? "Syncing..."
                  : "Sync Government"
              }
            </Button>


            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setUnsyncConfirmOpen(
                  true
                )
              }
              disabled={
                syncGovernmentHolidays.isPending ||
                unsyncGovernmentHolidays.isPending ||
                syncOfficeSundays.isPending
              }
              className="h-9 border-red-200 px-3 text-xs text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              {
                unsyncGovernmentHolidays.isPending
                  ? "Removing..."
                  : "Unsync"
              }
            </Button>

          </div>

        </div>


        {/* ====================================================
            OFFICE SUNDAY SYNC
        ==================================================== */}

        <div className="mt-4 border-t border-violet-100 pt-4 dark:border-violet-900/30">

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">

            <div>

              <div className="flex items-center gap-2">

                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                  S
                </div>

                <div>

                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                    Office Sunday Holidays
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Automatically add every Sunday as an Office Holiday.
                  </p>

                </div>

              </div>

            </div>


            <div className="flex flex-wrap items-center gap-2">

              <input
                type="number"
                min="1900"
                max="2100"
                value={
                  sundayStartYear
                }
                onChange={(event) =>
                  setSundayStartYear(
                    Number(
                      event.target.value
                    )
                  )
                }
                className="h-9 w-24 rounded-lg border border-slate-300 bg-white px-2 text-xs outline-none focus:border-sky-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />


              <span className="text-xs font-medium text-slate-400">
                to
              </span>


              <input
                type="number"
                min="1900"
                max="2100"
                value={
                  sundayEndYear
                }
                onChange={(event) =>
                  setSundayEndYear(
                    Number(
                      event.target.value
                    )
                  )
                }
                className="h-9 w-24 rounded-lg border border-slate-300 bg-white px-2 text-xs outline-none focus:border-sky-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />


              <Button
                type="button"
                variant="secondary"
                onClick={
                  handleSyncOfficeSundays
                }
                disabled={
                  syncOfficeSundays.isPending ||
                  syncGovernmentHolidays.isPending ||
                  unsyncGovernmentHolidays.isPending
                }
                className="h-9 border-sky-200 px-3 text-xs text-sky-700 hover:bg-sky-50 dark:border-sky-900/50 dark:text-sky-300 dark:hover:bg-sky-500/10"
              >
                {
                  syncOfficeSundays.isPending
                    ? "Adding Sundays..."
                    : "Add Sundays"
                }
              </Button>

            </div>

          </div>

        </div>

      </div>


      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">

        <SummaryCard
          label="Total"
          value={
            allHolidays.length
          }
          description="All saved"
          tone="primary"
          icon="H"
        />

        <SummaryCard
          label="Government"
          value={
            governmentHolidays.length
          }
          description="Active"
          tone="violet"
          icon="G"
        />

        <SummaryCard
          label="Office"
          value={
            officeHolidays.length
          }
          description="Active"
          tone="sky"
          icon="O"
        />

        <SummaryCard
          label="Inactive"
          value={
            allInactiveHolidays.length
          }
          description="Deactivated"
          tone="red"
          icon="I"
        />

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
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
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
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              listMode ===
              "grouped"
                ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            Year / Month
          </button>

        </div>

      </div>


      {/* ======================================================
          CALENDAR
      ====================================================== */}

      {listMode ===
        "calendar" && (

        <div className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">

          {/* CALENDAR HEADER */}

          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-violet-50/60 px-4 py-3 dark:border-slate-700 dark:from-slate-800/80 dark:via-slate-900 dark:to-violet-950/20">

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex flex-wrap items-center gap-1.5">

                <button
                  type="button"
                  onClick={
                    goToPrevMonth
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-base font-semibold text-slate-500 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-primary-500/10 dark:hover:text-primary-400"
                  aria-label="Previous month"
                >
                  ‹
                </button>


                <select
                  value={
                    calendarMonth
                  }
                  onChange={
                    handleCalendarMonthChange
                  }
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 outline-none focus:border-primary-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {MONTH_NAMES.map(
                    (
                      month,
                      index
                    ) => (
                      <option
                        key={
                          month
                        }
                        value={
                          index
                        }
                      >
                        {month}
                      </option>
                    )
                  )}
                </select>


                <select
                  value={
                    calendarYear
                  }
                  onChange={
                    handleCalendarYearChange
                  }
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 outline-none focus:border-primary-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {availableYears.map(
                    (year) => (
                      <option
                        key={
                          year
                        }
                        value={
                          year
                        }
                      >
                        {
                          year
                        }
                      </option>
                    )
                  )}
                </select>


                <button
                  type="button"
                  onClick={
                    goToNextMonth
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-base font-semibold text-slate-500 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-primary-500/10 dark:hover:text-primary-400"
                  aria-label="Next month"
                >
                  ›
                </button>


                <button
                  type="button"
                  onClick={
                    goToToday
                  }
                  className="h-8 rounded-lg bg-primary-600 px-3 text-[10px] font-bold text-white shadow-sm transition hover:bg-primary-700"
                >
                  Today
                </button>

              </div>


              <div className="flex flex-wrap items-center gap-2">

                <CalendarLegend
                  label="Government"
                  tone="violet"
                />

                <CalendarLegend
                  label="Office"
                  tone="sky"
                />

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">

                  {
                    calendarHolidaysThisMonth.length
                  }{" "}
                  Holiday
                  {
                    calendarHolidaysThisMonth.length ===
                    1
                      ? ""
                      : "s"
                  }

                </span>

              </div>

            </div>

          </div>


          {/* WEEKDAYS */}

          <div className="grid grid-cols-7 bg-slate-100/80 dark:bg-slate-800/80">

            {WEEKDAY_LABELS.map(
              (
                label,
                index
              ) => (
                <div
                  key={
                    label
                  }
                  className={`border-r border-slate-200 px-1 py-2 text-center text-[9px] font-bold uppercase tracking-wider last:border-r-0 dark:border-slate-700 ${
                    index === 0 ||
                    index === 6
                      ? "text-primary-400 dark:text-primary-500"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {label}
                </div>
              )
            )}

          </div>


          {/* CALENDAR GRID */}

          <div className="grid grid-cols-7 gap-px bg-slate-200/70 dark:bg-slate-700/70">

            {calendarCells.map(
              (cell) => {

                const isToday =
                  isTodayDate(
                    cell.year,
                    cell.month,
                    cell.day
                  );


                const dateObject =
                  new Date(
                    cell.year,
                    cell.month,
                    cell.day
                  );


                const dayOfWeek =
                  dateObject.getDay();


                const isSunday =
                  dayOfWeek ===
                  0;


                const isWeekend =
                  dayOfWeek ===
                    0 ||
                  dayOfWeek ===
                    6;


                const hasHoliday =
                  cell.holidays.length >
                  0;


                const governmentCount =
                  cell.holidays.filter(
                    (holiday) =>
                      getHolidayType(
                        holiday
                      ) ===
                      "Government"
                  ).length;


                const officeCount =
                  cell.holidays.filter(
                    (holiday) =>
                      getHolidayType(
                        holiday
                      ) ===
                      "Office"
                  ).length;


                return (
                  <div
                    key={`${cell.key}-${cell.isCurrentMonth}`}
                    onClick={() =>
                      handleCalendarCellClick(
                        cell
                      )
                    }
                    className={`group relative min-h-[118px] overflow-visible p-1.5 transition ${
                      cell.isCurrentMonth
                        ? "bg-white dark:bg-slate-900"
                        : "bg-slate-50/80 dark:bg-slate-950/50"
                    } ${
                      isSunday &&
                      cell.isCurrentMonth
                        ? "bg-sky-50/55 dark:bg-sky-950/10"
                        : isWeekend &&
                          cell.isCurrentMonth
                        ? "bg-amber-50/35 dark:bg-amber-950/10"
                        : ""
                    } ${
                      isToday
                        ? "ring-2 ring-inset ring-primary-400 dark:ring-primary-500"
                        : ""
                    } ${
                      cell.isCurrentMonth &&
                      !hasHoliday &&
                      canAdd
                        ? "cursor-pointer hover:bg-primary-50/40 dark:hover:bg-primary-500/10"
                        : ""
                    }`}
                  >

                    {/* DATE */}

                    <div className="flex items-center justify-between">

                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${
                          isToday
                            ? "bg-primary-600 text-white shadow-sm"
                            : cell.isCurrentMonth
                            ? isSunday
                              ? "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
                              : isWeekend
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-slate-700 dark:text-slate-200"
                            : "text-slate-300 dark:text-slate-600"
                        }`}
                      >
                        {
                          cell.day
                        }
                      </span>


                      {hasHoliday && (
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                          {
                            cell.holidays.length
                          }
                        </span>
                      )}

                    </div>


                    {/* HOLIDAYS */}

                    <div className="mt-1.5 space-y-1">

                      {cell.holidays
                        .slice(0, 2)
                        .map(
                          (
                            holiday
                          ) => {

                            const isGovernment =
                              getHolidayType(
                                holiday
                              ) ===
                              "Government";

                            const isSundayOffice =
                              !isGovernment &&
                              holiday.name
                                ?.trim()
                                .toLowerCase() ===
                                "sunday";


                            return (
                              <button
                                key={
                                  holiday.id
                                }
                                type="button"
                                onClick={(event) => {

                                  event.stopPropagation();

                                  if (
                                    canEdit
                                  ) {
                                    openEdit(
                                      holiday
                                    );
                                  }

                                }}
                                className={`flex w-full items-center gap-1.5 rounded-md border px-1.5 py-1.5 text-left transition ${
                                  isGovernment
                                    ? "border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 hover:border-violet-300 hover:from-violet-100 hover:to-purple-100 dark:border-violet-800/50 dark:from-violet-500/10 dark:to-purple-500/10 dark:text-violet-300"
                                    : isSundayOffice
                                    ? "border-sky-300 bg-gradient-to-r from-sky-100 to-cyan-50 text-sky-700 hover:border-sky-400 hover:from-sky-200 hover:to-cyan-100 dark:border-sky-700/60 dark:from-sky-500/15 dark:to-cyan-500/10 dark:text-sky-300"
                                    : "border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50 text-sky-700 hover:border-sky-300 hover:from-sky-100 hover:to-cyan-100 dark:border-sky-800/50 dark:from-sky-500/10 dark:to-cyan-500/10 dark:text-sky-300"
                                }`}
                                title={
                                  holiday.name
                                }
                              >

                                <span
                                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                    isGovernment
                                      ? "bg-violet-500"
                                      : "bg-sky-500"
                                  }`}
                                />

                                <span className="truncate text-[9px] font-semibold leading-3.5">
                                  {
                                    holiday.name
                                  }
                                </span>

                              </button>
                            );
                          }
                        )}


                      {cell.holidays.length >
                        2 && (
                        <div className="rounded-md bg-slate-100 px-1.5 py-1 text-[8px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          +
                          {
                            cell.holidays.length -
                            2
                          }{" "}
                          more
                        </div>
                      )}

                    </div>


                    {/* TYPE INDICATORS */}

                    {hasHoliday && (
                      <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">

                        {governmentCount >
                          0 && (
                          <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shadow-sm" />
                        )}

                        {officeCount >
                          0 && (
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shadow-sm" />
                        )}

                      </div>
                    )}


                    {/* CALENDAR HOVER */}

                    <div className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-[100] hidden w-[240px] -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-900 p-3 text-left shadow-2xl group-hover:block">

                      <div className="mb-2 flex items-center justify-between gap-2">

                        <div>

                          <p className="text-[10px] font-bold text-white">
                            {
                              formatDate(
                                cell.key
                              )
                            }
                          </p>

                          <p className="mt-0.5 text-[8px] text-slate-400">
                            {
                              cell.holidays.length
                            }{" "}
                            holiday
                            {
                              cell.holidays.length ===
                              1
                                ? ""
                                : "s"
                            }
                          </p>

                        </div>


                        {isToday && (
                          <span className="rounded-full bg-primary-500/20 px-2 py-0.5 text-[8px] font-semibold text-primary-300">
                            Today
                          </span>
                        )}

                      </div>


                      {hasHoliday ? (

                        <div className="space-y-1.5">

                          {cell.holidays.map(
                            (
                              holiday
                            ) => {

                              const isGovernment =
                                getHolidayType(
                                  holiday
                                ) ===
                                "Government";


                              return (
                                <div
                                  key={
                                    holiday.id
                                  }
                                  className="flex items-start gap-2 rounded-lg bg-white/5 px-2 py-1.5"
                                >

                                  <span
                                    className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                                      isGovernment
                                        ? "bg-violet-400"
                                        : "bg-sky-400"
                                    }`}
                                  />


                                  <div className="min-w-0">

                                    <p className="text-[9px] font-semibold text-white">
                                      {
                                        holiday.name
                                      }
                                    </p>

                                    <p className="mt-0.5 text-[8px] text-slate-400">
                                      {
                                        getHolidayType(
                                          holiday
                                        )
                                      }{" "}
                                      Holiday
                                    </p>

                                  </div>

                                </div>
                              );
                            }
                          )}

                        </div>

                      ) : (

                        <p className="text-[9px] text-slate-400">
                          No holiday scheduled.
                        </p>

                      )}

                    </div>

                  </div>
                );
              }
            )}

          </div>


          {/* FOOTER */}

          <div className="flex flex-col gap-1.5 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-violet-50/40 px-3 py-2 dark:border-slate-700 dark:from-slate-800 dark:to-violet-950/20 sm:flex-row sm:items-center sm:justify-between">

            <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400">

              {
                MONTH_NAMES[
                  calendarMonth
                ]
              }{" "}
              {
                calendarYear
              }

            </span>


            <span className="text-[9px] text-slate-400">
              Sundays are Office Holidays when synchronized
            </span>

          </div>

        </div>
      )}


      {/* ======================================================
          YEAR / MONTH LIST
      ====================================================== */}

      {listMode ===
        "grouped" && (

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">

          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-sm font-semibold text-slate-800 dark:text-white">
                Holiday List —{" "}
                {
                  listYear
                }
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {
                  yearTotals.government
                }{" "}
                Government ·{" "}
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
              onChange={(event) =>
                setListYear(
                  Number(
                    event.target.value
                  )
                )
              }
              className="h-8 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white sm:w-28"
            >

              {availableYears.map(
                (year) => (
                  <option
                    key={
                      year
                    }
                    value={
                      year
                    }
                  >
                    {
                      year
                    }
                  </option>
                )
              )}

            </select>

          </div>


          <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">

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
                    className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-800/40"
                  >

                    <div className="mb-2 flex items-center justify-between">

                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {
                          monthName
                        }
                      </h3>


                      <span className="rounded-full bg-white px-1.5 py-0.5 text-[8px] font-semibold text-slate-400 dark:bg-slate-900">
                        {
                          monthHolidays.length
                        }
                      </span>

                    </div>


                    <div className="space-y-1">

                      {monthHolidays.map(
                        (
                          holiday
                        ) => {

                          const isGovernment =
                            getHolidayType(
                              holiday
                            ) ===
                            "Government";

                          const isSunday =
                            !isGovernment &&
                            holiday.name
                              ?.trim()
                              .toLowerCase() ===
                              "sunday";

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
                              className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left ${
                                isGovernment
                                  ? "hover:bg-violet-50 dark:hover:bg-violet-500/10"
                                  : isSunday
                                  ? "bg-sky-50/60 hover:bg-sky-100 dark:bg-sky-500/10 dark:hover:bg-sky-500/15"
                                  : "hover:bg-sky-50 dark:hover:bg-sky-500/10"
                              }`}
                            >

                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                  isGovernment
                                    ? "bg-violet-500"
                                    : "bg-sky-500"
                                }`}
                              />


                              <div className="min-w-0 flex-1">

                                <p className="truncate text-[10px] font-semibold text-slate-700 dark:text-slate-200">
                                  {
                                    holiday.name
                                  }
                                </p>


                                <p className="text-[8px] text-slate-400">

                                  {
                                    isGovernment
                                      ? "Government"
                                      : "Office"
                                  }

                                  {" • "}

                                  {
                                    parsed?.day ||
                                    "-"
                                  }

                                </p>

                              </div>

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

              <div className="col-span-full py-8 text-center text-xs text-slate-400">
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

      <div className="w-full overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">

        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

            <div className="w-full lg:max-w-sm">

              <TableSearchBar
                value={
                  value
                }
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


            <div className="flex flex-wrap items-center gap-2">

              {/* TYPE */}

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
                      onClick={() => {

                        setTypeFilter(
                          filter.value
                        );

                        setPage(1);

                      }}
                      className={`rounded-md px-2.5 py-1.5 text-[10px] font-medium ${
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


              {/* STATUS */}

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
                      onClick={() => {

                        setStatusFilter(
                          filter.value
                        );

                        setPage(1);

                      }}
                      className={`rounded-md px-2.5 py-1.5 text-[10px] font-medium ${
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
          <div className="w-full overflow-visible">
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
          </div>
        )}


        {/* EMPTY */}

        {!isLoading &&
          !isError &&
          filteredHolidays.length ===
            0 && (

          <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-8 text-center">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">

              <span className="text-lg font-bold text-slate-400">
                H
              </span>

            </div>


            <h3 className="mt-3 text-sm font-semibold text-slate-800 dark:text-white">
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
                className="mt-3 h-8 px-3 text-xs"
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
          HOLIDAY DETAILS MODAL
      ====================================================== */}

      <Modal
        open={
          holidayDetailsOpen
        }
        onClose={() => {

          setHolidayDetailsOpen(
            false
          );

          setSelectedHoliday(
            null
          );

        }}
        title="Holiday Details"
      >

        {selectedHoliday && (
          <div className="space-y-5">

            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">

              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold ${
                  getHolidayType(
                    selectedHoliday
                  ) ===
                  "Government"
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
                    : "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
                }`}
              >
                {selectedHoliday.name
                  ?.charAt(0)
                  ?.toUpperCase() ||
                  "H"}
              </div>


              <div className="min-w-0">

                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {
                    selectedHoliday.name ||
                    "-"
                  }
                </h3>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Holiday information
                </p>

              </div>

            </div>


            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

              <HolidayDetailCard
                label="Holiday Name"
                value={
                  selectedHoliday.name ||
                  "-"
                }
              />

              <HolidayDetailCard
                label="Holiday Date"
                value={
                  selectedHoliday.holiday_date
                    ? formatDate(
                        selectedHoliday.holiday_date
                      )
                    : "-"
                }
              />

              <HolidayDetailCard
                label="Holiday Type"
                value={
                  getHolidayType(
                    selectedHoliday
                  )
                }
              />

              <HolidayDetailCard
                label="Status"
                value={
                  selectedHoliday.is_active
                    ? "Active"
                    : "Inactive"
                }
              />

            </div>


            <div
              className={`rounded-xl border p-4 ${
                getHolidayType(
                  selectedHoliday
                ) ===
                "Government"
                  ? "border-violet-200 bg-violet-50/60 dark:border-violet-900/40 dark:bg-violet-500/10"
                  : "border-sky-200 bg-sky-50/60 dark:border-sky-900/40 dark:bg-sky-500/10"
              }`}
            >

              <div className="flex items-center gap-2">

                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    getHolidayType(
                      selectedHoliday
                    ) ===
                    "Government"
                      ? "bg-violet-500"
                      : "bg-sky-500"
                  }`}
                />

                <div>

                  <p className="text-xs font-semibold text-slate-800 dark:text-white">
                    {getHolidayType(
                      selectedHoliday
                    ) ===
                    "Government"
                      ? "Government Holiday"
                      : "Office Holiday"}
                  </p>

                  <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    {getHolidayType(
                      selectedHoliday
                    ) ===
                    "Government"
                      ? "Government/public holiday"
                      : selectedHoliday.name
                          ?.trim()
                          .toLowerCase() ===
                        "sunday"
                      ? "Recurring weekly Office Holiday"
                      : "Company-declared holiday"}
                  </p>

                </div>

              </div>

            </div>


            <div className="flex justify-end gap-2">

              {canEdit && (
                <Button
                  variant="secondary"
                  onClick={() => {

                    setHolidayDetailsOpen(
                      false
                    );

                    openEdit(
                      selectedHoliday
                    );

                  }}
                >
                  Edit Holiday
                </Button>
              )}


              <Button
                onClick={() => {

                  setHolidayDetailsOpen(
                    false
                  );

                  setSelectedHoliday(
                    null
                  );

                }}
              >
                Close
              </Button>

            </div>

          </div>
        )}

      </Modal>


      {/* ======================================================
          DEACTIVATE
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
          UNSYNC GOVERNMENT
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