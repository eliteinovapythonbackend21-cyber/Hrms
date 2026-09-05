import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  useHolidays,
  useCreateHoliday,
  useUpdateHoliday,
  useDeactivateHoliday,
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
import {
  use3DTilt,
  useMagnetic,
  Motion3DStyles,
  GridPattern,
} from "@/hooks/use3DMotion";

import { getHolidayType } from "./holidayHelpers";

/* ============================================================
   EXPORT COLUMNS
============================================================ */

const EXPORT_COLUMNS = [
  { header: "Name", accessor: (row) => row.name },
  { header: "Date", accessor: (row) => formatDate(row.holiday_date) },
  { header: "Type", accessor: (row) => row.holiday_type || "Office" },
  {
    header: "Status",
    accessor: (row) => (row.is_active ? "Active" : "Inactive"),
  },
];

/* ============================================================
   DETAIL ROW (table hover panel)
============================================================ */

function DetailRow({ label, value }) {
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
   HOLIDAY DETAIL CARD (details modal)
============================================================ */

function HolidayDetailCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
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
   SUMMARY CARD
============================================================ */

function SummaryCard({ label, value, description, tone, icon }) {
  const styles = {
    primary: {
      border: "border-slate-200 dark:border-white/10",
      icon: "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400",
      value: "text-slate-900 dark:text-white",
    },
    violet: {
      border: "border-violet-100 dark:border-violet-900/30",
      icon: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
      value: "text-violet-600 dark:text-violet-400",
    },
    sky: {
      border: "border-sky-100 dark:border-sky-900/30",
      icon: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
      value: "text-sky-600 dark:text-sky-400",
    },
    red: {
      border: "border-red-100 dark:border-red-900/30",
      icon: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
      value: "text-red-600 dark:text-red-400",
    },
  };

  const current = styles[tone] || styles.primary;
  const { ref, handlers } = use3DTilt({ max: 8, scale: 1.02 });

  return (
    <div className="u-tilt-perspective">
      <div
        ref={ref}
        {...handlers}
        className={`u-tilt u-glare relative h-[100px] overflow-hidden rounded-xl border bg-white px-3 py-2.5 shadow-sm dark:bg-white/[0.04] ${current.border}`}
      >
        <div className="u-tilt-content flex h-full items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {label}
            </p>

            <p className={`mt-1 text-xl font-bold ${current.value}`}>
              {value}
            </p>

            <p className="truncate text-[9px] text-slate-400">
              {description}
            </p>
          </div>

          <div
            className={`u-float-layer flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${current.icon}`}
          >
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN PAGE — HOLIDAYS LIST ONLY
   Calendar view + Government/Sunday sync now live on the
   dedicated "Calendar" screen (HolidayCalendarPage.jsx).
============================================================ */

export default function HolidayListPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { params, page, perPage, setPage, setPerPage } = usePagination();
  const { value, setValue, debouncedValue } = useDebouncedSearch();

  const [statusFilter, setStatusFilter] = useState("active");
  const [typeFilter, setTypeFilter] = useState("all");

  const queryParams = {
    ...params,
    search: debouncedValue || undefined,
    holiday_type: typeFilter !== "all" ? typeFilter : undefined,
    is_active:
      statusFilter === "all"
        ? undefined
        : statusFilter === "active"
        ? "true"
        : "false",
  };

  const { data, isLoading, isError, isFetching, refetch } =
    useHolidays(queryParams);

  const { canAdd, canEdit, canDelete } = useModulePermissions("Holidays");
  const addMagnet = useMagnetic(0.25);

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: holidayApi.list,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "holidays",
    title: "Holidays",
  });

  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const deactivateHoliday = useDeactivateHoliday();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);

  const [holidayDetailsOpen, setHolidayDetailsOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState(null);

  /* ==========================================================
     SUMMARY TOTALS
     Fetched separately (all pages) so the stat tiles reflect the
     whole dataset, not just the current page/filter.
  ========================================================== */

  const { data: allHolidaysData } = useHolidays({
    page: 1,
    per_page: 1000,
  });

  const holidays = data?.items || [];
  const allHolidays = allHolidaysData?.items || [];

  const allActiveHolidays = allHolidays.filter((holiday) => holiday.is_active);
  const allInactiveHolidays = allHolidays.filter(
    (holiday) => !holiday.is_active
  );

  const governmentHolidays = allActiveHolidays.filter(
    (holiday) => getHolidayType(holiday) === "Government"
  );

  const officeHolidays = allActiveHolidays.filter(
    (holiday) => getHolidayType(holiday) === "Office"
  );

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (holiday) => {
    if (!holiday) return;
    setEditing(holiday);
    setModalOpen(true);
  };

  const openHolidayDetails = (holiday) => {
    if (!holiday) return;
    setSelectedHoliday(holiday);
    setHolidayDetailsOpen(true);
  };

  /* ==========================================================
     FILTERED HOLIDAYS
     Client-side safety net — the backend also filters by
     holiday_type / is_active.
  ========================================================== */

  const filteredHolidays = holidays.filter((holiday) => {
    if (statusFilter === "active" && !holiday.is_active) return false;
    if (statusFilter === "inactive" && holiday.is_active) return false;

    if (
      typeFilter !== "all" &&
      getHolidayType(holiday) !== typeFilter
    ) {
      return false;
    }

    return true;
  });

  const handleSubmit = async (payload) => {
    try {
      if (editing) {
        await updateHoliday.mutateAsync({ id: editing.id, payload });
        showToast("Holiday updated successfully", "success");
      } else {
        await createHoliday.mutateAsync(payload);
        showToast("Holiday created successfully", "success");
      }

      setModalOpen(false);
      setEditing(null);

      await queryClient.invalidateQueries({ queryKey: ["holidays"] });
    } catch (error) {
      showToast(
        error?.response?.data?.message || "Operation failed",
        "error"
      );
    }
  };

  const handleDeactivate = async () => {
    if (!confirmRow) return;

    try {
      await deactivateHoliday.mutateAsync(confirmRow.id);
      showToast("Holiday deactivated successfully", "success");
      setConfirmRow(null);

      await queryClient.invalidateQueries({ queryKey: ["holidays"] });
    } catch (error) {
      showToast(
        error?.response?.data?.message || "Operation failed",
        "error"
      );
    }
  };

  const columns = [
    {
      key: "name",
      label: "Holiday",
      className: "w-[34%]",
      headerClassName: "w-[34%]",
      cellClassName: "w-[34%]",
      render: (row) => {
        const firstLetter = row.name?.charAt(0)?.toUpperCase() || "H";
        const isGovernment = getHolidayType(row) === "Government";

        return (
          <div className="group relative flex min-w-0 items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                isGovernment
                  ? "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
                  : "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"
              }`}
            >
              {firstLetter}
            </div>

            <button
              type="button"
              onClick={() => openHolidayDetails(row)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-sm font-semibold text-slate-800 underline decoration-transparent underline-offset-2 transition hover:text-primary-600 hover:decoration-primary-400 dark:text-white dark:hover:text-primary-400">
                {row.name || "-"}
              </p>

              <p className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-slate-400">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    isGovernment ? "bg-violet-500" : "bg-sky-500"
                  }`}
                />
                <span className="truncate">
                  {isGovernment ? "Government Holiday" : "Office Holiday"}
                </span>
              </p>
            </button>

            <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 hidden w-[280px] rounded-xl border border-slate-200 bg-white p-3 text-left shadow-2xl group-hover:block dark:border-white/10 dark:bg-white/[0.04]">
              <div className="absolute -bottom-1.5 left-8 h-3 w-3 rotate-45 border-b border-r border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]" />

              <div className="relative">
                <div className="flex items-start gap-2">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      isGovernment
                        ? "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
                        : "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"
                    }`}
                  >
                    {firstLetter}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-800 dark:text-white">
                      {row.name || "-"}
                    </p>
                    <p className="mt-0.5 text-[9px] text-slate-400">
                      Holiday Details
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <DetailRow
                    label="Date"
                    value={row.holiday_date ? formatDate(row.holiday_date) : "-"}
                  />
                  <DetailRow label="Type" value={getHolidayType(row)} />
                  <DetailRow
                    label="Status"
                    value={row.is_active ? "Active" : "Inactive"}
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
      key: "holiday_date",
      label: "Date",
      className: "w-[15%] whitespace-nowrap",
      headerClassName: "w-[15%]",
      cellClassName: "w-[15%] whitespace-nowrap",
      render: (row) => (
        <span className="block truncate text-sm font-medium text-slate-600 dark:text-slate-300">
          {formatDate(row.holiday_date)}
        </span>
      ),
    },
    {
      key: "holiday_type",
      label: "Type",
      className: "w-[15%]",
      headerClassName: "w-[15%]",
      cellClassName: "w-[15%]",
      render: (row) => {
        const type = getHolidayType(row);
        const isGovernment = type === "Government";

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
      key: "status",
      label: "Status",
      className: "w-[14%]",
      headerClassName: "w-[14%]",
      cellClassName: "w-[14%]",
      render: (row) => (
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
          {row.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      className: "w-[22%]",
      headerClassName: "w-[22%]",
      cellClassName: "w-[22%]",
      render: (row) => (
        <div className="flex items-center justify-start gap-1.5 whitespace-nowrap">
          {canEdit && (
            <button
              type="button"
              onClick={() => openEdit(row)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-primary-600 transition hover:bg-primary-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-primary-400 dark:hover:bg-primary-500/10"
            >
              Edit
            </button>
          )}

          {row.is_active && canDelete && (
            <button
              type="button"
              onClick={() => setConfirmRow(row)}
              className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:bg-white/[0.06] dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Deactivate
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <Motion3DStyles />

      {/* HEADER */}

      <div className="u-rise relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-primary-50/40 to-white p-4 shadow-sm dark:border-white/[0.08] dark:from-primary-500/[0.08] dark:via-white/[0.02] dark:to-transparent xl:flex-row xl:items-center xl:justify-between">
        <GridPattern id="holiday-grid" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-500/15 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="u-hover-float">
              <div className="u-float-target flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-600/30 ring-1 ring-white/20">
                <span className="font-bold">H</span>
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Holidays
              </h1>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                View the full list of government and office holidays
              </p>
            </div>
          </div>
        </div>

        <div className="relative flex flex-wrap items-center gap-2">
          <TableToolbar
            onRefresh={refetch}
            refreshing={isFetching}
            onExportExcel={exportExcel}
            onExportPDF={exportPDF}
            exporting={exporting}
          />

          {canAdd && (
            <div
              ref={addMagnet.ref}
              {...addMagnet.handlers}
              className="inline-block will-change-transform"
            >
              <Button
                onClick={openAdd}
                className="h-10 px-4 shadow-sm transition-shadow duration-200 hover:shadow-lg"
              >
                <span className="mr-1 text-lg leading-none transition-transform duration-300 hover:rotate-90">
                  +
                </span>
                Add Holiday
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* SUMMARY */}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard
          label="Total"
          value={allHolidays.length}
          description="All saved"
          tone="primary"
          icon="H"
        />
        <SummaryCard
          label="Government"
          value={governmentHolidays.length}
          description="Active"
          tone="violet"
          icon="G"
        />
        <SummaryCard
          label="Office"
          value={officeHolidays.length}
          description="Active"
          tone="sky"
          icon="O"
        />
        <SummaryCard
          label="Inactive"
          value={allInactiveHolidays.length}
          description="Deactivated"
          tone="red"
          icon="I"
        />
      </div>

      {/* TABLE */}

      <div className="w-full overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-white/10">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full lg:max-w-sm">
              <TableSearchBar
                value={value}
                onChange={(newValue) => {
                  setValue(newValue);
                  setPage(1);
                }}
                placeholder="Search holidays..."
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* TYPE */}
              <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">
                {[
                  { value: "all", label: "All Types" },
                  { value: "Government", label: "Government" },
                  { value: "Office", label: "Office" },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => {
                      setTypeFilter(filter.value);
                      setPage(1);
                    }}
                    className={`rounded-md px-2.5 py-1.5 text-[10px] font-medium ${
                      typeFilter === filter.value
                        ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* STATUS */}
              <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">
                {[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                  { value: "all", label: "All" },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(filter.value);
                      setPage(1);
                    }}
                    className={`rounded-md px-2.5 py-1.5 text-[10px] font-medium ${
                      statusFilter === filter.value
                        ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ERROR */}

        {isError && (
          <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-400">
            <p className="font-medium">Failed to load holidays.</p>
            <p className="mt-1 text-xs opacity-80">
              Please refresh the page and try again.
            </p>
          </div>
        )}

        {/* TABLE */}

        {!isError && (
          <div className="w-full overflow-visible">
            <DataTable columns={columns} data={filteredHolidays} loading={isLoading} />
          </div>
        )}

        {/* EMPTY */}

        {!isLoading && !isError && filteredHolidays.length === 0 && (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.06]">
              <span className="text-lg font-bold text-slate-400">H</span>
            </div>

            <h3 className="mt-3 text-sm font-semibold text-slate-800 dark:text-white">
              No holidays found
            </h3>

            <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              No holidays match your current filters.
            </p>

            {canAdd && (
              <Button onClick={openAdd} className="mt-3 h-8 px-3 text-xs">
                + Add Holiday
              </Button>
            )}
          </div>
        )}

        {/* PAGINATION */}

        <div className="border-t border-slate-200 px-2 dark:border-white/10">
          <TablePagination
            page={page}
            pages={data?.pages || 1}
            total={data?.total || 0}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={(value) => {
              setPerPage(value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* ADD / EDIT MODAL */}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit Holiday" : "Add Holiday"}
      >
        <HolidayForm
          initialData={editing || {}}
          onSubmit={handleSubmit}
          loading={createHoliday.isPending || updateHoliday.isPending}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          isEdit={!!editing}
        />
      </Modal>

      {/* HOLIDAY DETAILS MODAL */}

      <Modal
        open={holidayDetailsOpen}
        onClose={() => {
          setHolidayDetailsOpen(false);
          setSelectedHoliday(null);
        }}
        title="Holiday Details"
      >
        {selectedHoliday && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.06]/60">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold ${
                  getHolidayType(selectedHoliday) === "Government"
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
                    : "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
                }`}
              >
                {selectedHoliday.name?.charAt(0)?.toUpperCase() || "H"}
              </div>

              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedHoliday.name || "-"}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Holiday information
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <HolidayDetailCard
                label="Holiday Name"
                value={selectedHoliday.name || "-"}
              />
              <HolidayDetailCard
                label="Holiday Date"
                value={
                  selectedHoliday.holiday_date
                    ? formatDate(selectedHoliday.holiday_date)
                    : "-"
                }
              />
              <HolidayDetailCard
                label="Holiday Type"
                value={getHolidayType(selectedHoliday)}
              />
              <HolidayDetailCard
                label="Status"
                value={selectedHoliday.is_active ? "Active" : "Inactive"}
              />
            </div>

            <div
              className={`rounded-xl border p-4 ${
                getHolidayType(selectedHoliday) === "Government"
                  ? "border-violet-200 bg-violet-50/60 dark:border-violet-900/40 dark:bg-violet-500/10"
                  : "border-sky-200 bg-sky-50/60 dark:border-sky-900/40 dark:bg-sky-500/10"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    getHolidayType(selectedHoliday) === "Government"
                      ? "bg-violet-500"
                      : "bg-sky-500"
                  }`}
                />
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-white">
                    {getHolidayType(selectedHoliday) === "Government"
                      ? "Government Holiday"
                      : "Office Holiday"}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    {getHolidayType(selectedHoliday) === "Government"
                      ? "Government/public holiday"
                      : selectedHoliday.name?.trim().toLowerCase() === "sunday"
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
                    setHolidayDetailsOpen(false);
                    openEdit(selectedHoliday);
                  }}
                >
                  Edit Holiday
                </Button>
              )}

              <Button
                onClick={() => {
                  setHolidayDetailsOpen(false);
                  setSelectedHoliday(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* DEACTIVATE */}

      <ConfirmDialog
        open={!!confirmRow}
        onClose={() => setConfirmRow(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Holiday"
        message="Are you sure you want to deactivate this holiday?"
        confirmText="Deactivate"
        loading={deactivateHoliday.isPending}
      />
    </div>
  );
}
