import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  useHolidays,
  useCreateHoliday,
  useUpdateHoliday,
  useDeactivateHoliday,
  useDownloadHolidayList,
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


const EXPORT_COLUMNS = [
  { header: "Name", accessor: (r) => r.name },
  { header: "Date", accessor: (r) => formatDate(r.holiday_date) },
  { header: "Type", accessor: (r) => r.holiday_type || "Office" },
  { header: "Status", accessor: (r) => (r.is_active ? "Active" : "Inactive") },
];


export default function HolidayListPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { params, page, perPage, setPage, setPerPage } = usePagination();
  const { value, setValue, debouncedValue } = useDebouncedSearch();

  const queryParams = {
    ...params,
    search: debouncedValue || undefined,
  };

  const { data, isLoading, isError, isFetching, refetch } = useHolidays(queryParams);

  const { canAdd, canEdit, canDelete } = useModulePermissions("Holidays");

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: holidayApi.listHolidays,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "holidays",
    title: "Holidays",
  });

  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const deactivateHoliday = useDeactivateHoliday();
  const downloadHolidayList = useDownloadHolidayList();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);

  const [statusFilter, setStatusFilter] = useState("active");
  const [typeFilter, setTypeFilter] = useState("all");

  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  const holidays = data?.items || [];

  const activeHolidays = holidays.filter((h) => h.is_active);
  const inactiveHolidays = holidays.filter((h) => !h.is_active);

  const governmentHolidays = activeHolidays.filter(
    (h) => (h.holiday_type || "Office") === "Government"
  );
  const officeHolidays = activeHolidays.filter(
    (h) => (h.holiday_type || "Office") === "Office"
  );

  const sortedGovernmentHolidays = [...governmentHolidays].sort(
    (a, b) => new Date(a.holiday_date) - new Date(b.holiday_date)
  );
  const sortedOfficeHolidays = [...officeHolidays].sort(
    (a, b) => new Date(a.holiday_date) - new Date(b.holiday_date)
  );

  const filteredHolidays = holidays.filter((holiday) => {
    if (statusFilter === "active" && !holiday.is_active) return false;
    if (statusFilter === "inactive" && holiday.is_active) return false;
    if (typeFilter !== "all" && (holiday.holiday_type || "Office") !== typeFilter) return false;
    return true;
  });

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setModalOpen(true);
  };

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

      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      refetch();
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateHoliday.mutateAsync(confirmRow.id);
      showToast("Holiday deactivated successfully", "success");
      setConfirmRow(null);

      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      refetch();
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const handleDownloadHolidayList = async () => {
    try {
      await downloadHolidayList.mutateAsync(reportYear);
      showToast("Holiday list downloaded", "success");
    } catch (err) {
      showToast(
        err?.response?.data?.message || "Failed to download holiday list",
        "error"
      );
    }
  };

  const columns = [
    {
      key: "name",
      label: "Holiday",
      render: (r) => {
        const firstLetter = r.name?.charAt(0)?.toUpperCase() || "H";
        return (
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <span className="text-sm font-bold">{firstLetter}</span>
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-800 dark:text-white">
                {r.name || "-"}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "holiday_date",
      label: "Date",
      render: (r) => (
        <span className="block truncate text-sm font-medium text-slate-600 dark:text-slate-300">
          {formatDate(r.holiday_date)}
        </span>
      ),
    },
    {
      key: "holiday_type",
      label: "Type",
      render: (r) => {
        const type = r.holiday_type || "Office";
        const isGovernment = type === "Government";
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
      key: "status",
      label: "Status",
      render: (r) => (
        <Badge
          className={
            r.is_active
              ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300"
          }
        >
          <span
            className={
              r.is_active
                ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
                : "h-1.5 w-1.5 rounded-full bg-red-500"
            }
          />
          {r.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          {canEdit && (
            <button
              type="button"
              onClick={() => openEdit(r)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-primary-600 transition hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-800 dark:text-primary-400 dark:hover:bg-primary-500/10"
            >
              Edit
            </button>
          )}
          {r.is_active && canDelete && (
            <button
              type="button"
              onClick={() => setConfirmRow(r)}
              className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-500/10"
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
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
              <span className="font-bold">H</span>
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
            onRefresh={refetch}
            refreshing={isFetching}
            onExportExcel={exportExcel}
            onExportPDF={exportPDF}
            exporting={exporting}
          />

          <div className="flex items-center gap-2">
            <input
              type="number"
              value={reportYear}
              onChange={(e) => setReportYear(Number(e.target.value))}
              title="Year for holiday list"
              className="h-10 w-24 rounded-lg border border-slate-300 bg-white px-2 text-sm outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleDownloadHolidayList}
              disabled={downloadHolidayList.isPending}
              className="h-10 px-4"
            >
              {downloadHolidayList.isPending ? "Preparing..." : "Download Holiday List"}
            </Button>
          </div>

          {canAdd && (
            <Button onClick={openAdd} className="h-10 w-full px-4 sm:w-auto">
              <span className="mr-1.5 text-lg">+</span>
              Add Holiday
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="h-[110px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Holidays
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {holidays.length}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">Current page</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <span className="text-sm font-bold">H</span>
            </div>
          </div>
        </div>

        <div className="h-[110px] rounded-xl border border-violet-100 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-violet-900/30 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                Government Holidays
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-violet-600 dark:text-violet-400">
                {governmentHolidays.length}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">Active, national/state</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-500/10">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
            </div>
          </div>
        </div>

        <div className="h-[110px] rounded-xl border border-sky-100 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-sky-900/30 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                Office Holidays
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-sky-600 dark:text-sky-400">
                {officeHolidays.length}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">Active, company-declared</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-500/10">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            </div>
          </div>
        </div>

        <div className="h-[110px] rounded-xl border border-red-100 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-red-900/30 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                Inactive Holidays
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
                {inactiveHolidays.length}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">Deactivated holidays</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-500/10">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* GROUPED HOLIDAY LIST — Government / Office */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm dark:border-violet-900/30 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-violet-700 dark:text-violet-400">
              Government Holidays
            </h3>
            <Badge className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
              {sortedGovernmentHolidays.length}
            </Badge>
          </div>

          {sortedGovernmentHolidays.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">
              No active government holidays.
            </p>
          ) : (
            <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
              {sortedGovernmentHolidays.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">
                    {h.name}
                  </span>
                  <span className="ml-3 shrink-0 text-xs text-slate-400">
                    {formatDate(h.holiday_date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-sky-100 bg-white p-4 shadow-sm dark:border-sky-900/30 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-sky-700 dark:text-sky-400">
              Office Holidays
            </h3>
            <Badge className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
              {sortedOfficeHolidays.length}
            </Badge>
          </div>

          {sortedOfficeHolidays.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">
              No active office holidays.
            </p>
          ) : (
            <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
              {sortedOfficeHolidays.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">
                    {h.name}
                  </span>
                  <span className="ml-3 shrink-0 text-xs text-slate-400">
                    {formatDate(h.holiday_date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full lg:max-w-sm">
              <TableSearchBar
                value={value}
                onChange={setValue}
                placeholder="Search holidays..."
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setTypeFilter("all")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    typeFilter === "all"
                      ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  All Types
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("Government")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    typeFilter === "Government"
                      ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  Government
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("Office")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    typeFilter === "Office"
                      ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  Office
                </button>
              </div>

              <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setStatusFilter("active")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    statusFilter === "active"
                      ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("inactive")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    statusFilter === "inactive"
                      ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  Inactive
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    statusFilter === "all"
                      ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  All
                </button>
              </div>
            </div>
          </div>
        </div>

        {isError && (
          <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-400">
            <p className="font-medium">Failed to load holidays.</p>
            <p className="mt-1 text-xs opacity-80">Please refresh the page and try again.</p>
          </div>
        )}

        {!isError && (
          <div className="w-full">
            <DataTable columns={columns} data={filteredHolidays} loading={isLoading} />
          </div>
        )}

        {!isLoading && !isError && filteredHolidays.length === 0 && (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
              <span className="text-xl font-bold text-slate-400">H</span>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-800 dark:text-white">
              No holidays found
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              No holidays match your current search, type, or status filter.
            </p>
            {canAdd && (
              <Button onClick={openAdd} className="mt-4 h-9 px-4 text-sm">
                + Add Holiday
              </Button>
            )}
          </div>
        )}

        <div className="border-t border-slate-200 px-2 dark:border-slate-700">
          <TablePagination
            page={page}
            pages={data?.pages || 1}
            total={data?.total || 0}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        </div>
      </div>

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