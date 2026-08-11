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


const EXPORT_COLUMNS = [
  {
    header: "Name",
    accessor: (r) => r.name,
  },
  {
    header: "Date",
    accessor: (r) => formatDate(r.holiday_date),
  },
  {
    header: "Status",
    accessor: (r) =>
      r.is_active ? "Active" : "Inactive",
  },
];


export default function HolidayListPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const {
    params,
    page,
    perPage,
    setPage,
    setPerPage,
  } = usePagination();

  const {
    value,
    setValue,
    debouncedValue,
  } = useDebouncedSearch();


  const queryParams = {
    ...params,
    search: debouncedValue || undefined,
  };


  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useHolidays(queryParams);


  const {
    canAdd,
    canEdit,
    canDelete,
  } = useModulePermissions("Holidays");


  const {
    exporting,
    exportExcel,
    exportPDF,
  } = useTableExport({
    fetchAll: holidayApi.listHolidays,
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

  const [statusFilter, setStatusFilter] = useState("active");


  const holidays = data?.items || [];


  const activeHolidays = holidays.filter(
    (holiday) => holiday.is_active
  );


  const inactiveHolidays = holidays.filter(
    (holiday) => !holiday.is_active
  );


  const filteredHolidays = holidays.filter(
    (holiday) => {
      if (statusFilter === "active") {
        return holiday.is_active;
      }

      if (statusFilter === "inactive") {
        return !holiday.is_active;
      }

      return true;
    }
  );


  // =====================================================
  // OPEN ADD
  // =====================================================

  const openAdd = () => {
    setEditing(null);

    setModalOpen(true);
  };


  // =====================================================
  // OPEN EDIT
  // =====================================================

  const openEdit = (row) => {
    setEditing(row);

    setModalOpen(true);
  };


  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (payload) => {
    try {
      if (editing) {
        await updateHoliday.mutateAsync({
          id: editing.id,
          payload,
        });

        showToast(
          "Holiday updated successfully",
          "success"
        );
      } else {
        await createHoliday.mutateAsync(payload);

        showToast(
          "Holiday created successfully",
          "success"
        );
      }

      setModalOpen(false);
      setEditing(null);

      queryClient.invalidateQueries({
        queryKey: ["holidays"],
      });

      refetch();
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          "Operation failed",
        "error"
      );
    }
  };


  // =====================================================
  // DEACTIVATE
  // =====================================================

  const handleDeactivate = async () => {
    try {
      await deactivateHoliday.mutateAsync(
        confirmRow.id
      );

      showToast(
        "Holiday deactivated successfully",
        "success"
      );

      setConfirmRow(null);

      queryClient.invalidateQueries({
        queryKey: ["holidays"],
      });

      refetch();
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          "Operation failed",
        "error"
      );
    }
  };


  // =====================================================
  // TABLE COLUMNS
  // =====================================================

  const columns = [
    {
      key: "name",
      label: "Holiday",

      render: (r) => {
        const firstLetter =
          r.name?.charAt(0)?.toUpperCase() || "H";

        return (
          <div className="flex min-w-0 items-center gap-2">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <span className="text-sm font-bold">
                {firstLetter}
              </span>
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

          {r.is_active
            ? "Active"
            : "Inactive"}

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


      {/* =====================================================
          PAGE HEADER
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
                Manage organization holidays
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

          {canAdd && (
            <Button
              onClick={openAdd}
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


      {/* =====================================================
          COMPACT STAT CARDS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">


        {/* TOTAL */}

        <div className="h-[110px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900">

          <div className="flex h-full items-center justify-between">

            <div className="min-w-0">

              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Holidays
              </p>

              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {holidays.length}
              </p>

              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                Current page
              </p>

            </div>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">

              <span className="text-sm font-bold">
                H
              </span>

            </div>

          </div>

        </div>


        {/* ACTIVE */}

        <div className="h-[110px] rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-emerald-900/30 dark:bg-slate-900">

          <div className="flex h-full items-center justify-between">

            <div className="min-w-0">

              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                Active Holidays
              </p>

              <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {activeHolidays.length}
              </p>

              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                Currently active
              </p>

            </div>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">

              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

            </div>

          </div>

        </div>


        {/* INACTIVE */}

        <div className="h-[110px] rounded-xl border border-red-100 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-red-900/30 dark:bg-slate-900">

          <div className="flex h-full items-center justify-between">

            <div className="min-w-0">

              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                Inactive Holidays
              </p>

              <p className="mt-1 text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
                {inactiveHolidays.length}
              </p>

              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                Deactivated holidays
              </p>

            </div>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-500/10">

              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />

            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          TABLE CARD
      ====================================================== */}

      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">


        {/* TABLE HEADER */}

        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

            <div className="w-full lg:max-w-sm">

              <TableSearchBar
                value={value}
                onChange={setValue}
                placeholder="Search holidays..."
              />

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


        {/* FIXED TABLE */}

        {!isError && (
          <div className="w-full">

            <DataTable
              columns={columns}
              data={filteredHolidays}
              loading={isLoading}
            />

          </div>
        )}


        {/* EMPTY STATE */}

        {!isLoading &&
          !isError &&
          filteredHolidays.length === 0 && (

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
                No holidays match your current search or status filter.
              </p>

              {canAdd && (
                <Button
                  onClick={openAdd}
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
            page={page}
            pages={data?.pages || 1}
            total={data?.total || 0}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />

        </div>

      </div>


      {/* =====================================================
          HOLIDAY MODAL
      ====================================================== */}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={
          editing
            ? "Edit Holiday"
            : "Add Holiday"
        }
      >

        <HolidayForm
          initialData={editing || {}}
          onSubmit={handleSubmit}
          loading={
            createHoliday.isPending ||
            updateHoliday.isPending
          }
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          isEdit={!!editing}
        />

      </Modal>


      {/* =====================================================
          DEACTIVATE CONFIRMATION
      ====================================================== */}

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
