import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  useUsers,
  useDeactivateUser,
} from "./useUsers";

import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";

import { usePagination } from "@/hooks/usePagination";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useTableExport } from "@/hooks/useTableExport";
import { useToast } from "@/components/feedback/Toast";

import TableSearchBar from "@/components/table/TableSearchBar";
import TablePagination from "@/components/table/TablePagination";

import { usersApi } from "@/api/users.api";
import { useModulePermissions } from "@/hooks/useModulePermissions";

/* ============================================================
   EXPORT COLUMNS
============================================================ */

const EXPORT_COLUMNS = [
  {
    header: "ID",
    accessor: (row) => row.id,
  },
  {
    header: "Username",
    accessor: (row) => row.username || "-",
  },
  {
    header: "Email",
    accessor: (row) => row.email || "-",
  },
  {
    header: "Mobile",
    accessor: (row) => row.mobile || "-",
  },
  {
    header: "Role",
    accessor: (row) => row.role || "-",
  },
  {
    header: "Status",
    accessor: (row) => (row.is_active ? "Active" : "Inactive"),
  },
];

/* ============================================================
   PAGE
============================================================ */

export default function UserListPage({ role }) {
  const navigate = useNavigate();
  const { showToast } = useToast();

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

  /* ==========================================================
     QUERY PARAMS
  ========================================================== */

  const queryParams = {
    ...params,
    search: debouncedValue || undefined,
    role: role || undefined,
  };

  /* ==========================================================
     USER LIST
  ========================================================== */

  const {
    data,
    isLoading,
    isError,
  } = useUsers(queryParams);

  /* ==========================================================
     PERMISSIONS
  ========================================================== */

  const {
    canAdd,
    canEdit,
    canDelete,
  } = useModulePermissions("Users");

  /* ==========================================================
     EXPORT
  ========================================================== */

  const {
    exporting,
    exportExcel,
    exportPDF,
  } = useTableExport({
    fetchAll: usersApi.list,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename:
      role === "admin"
        ? "admins"
        : role === "employee"
        ? "employees"
        : "users",
    title:
      role === "admin"
        ? "Admins"
        : role === "employee"
        ? "Employees"
        : "Users",
  });

  /* ==========================================================
     DEACTIVATE
  ========================================================== */

  const deactivateUser = useDeactivateUser();
  const [confirmRow, setConfirmRow] = useState(null);

  /* ==========================================================
     PAGE LABELS
  ========================================================== */

  const pageTitle =
    role === "admin"
      ? "Admins"
      : role === "employee"
      ? "Employees"
      : "Users";

  const pageDescription =
    role === "admin"
      ? "Manage administrator accounts and access"
      : role === "employee"
      ? "Manage employee user accounts and access"
      : "Manage user accounts and access";

  const addButtonLabel =
    role === "admin"
      ? "Add Admin"
      : role === "employee"
      ? "Add Employee"
      : "Add User";

  /* ==========================================================
     ADD USER
  ========================================================== */

  const openAdd = () => {
    navigate("/users/new", {
      state: {
        role,
      },
    });
  };

  /* ==========================================================
     EDIT USER
  ========================================================== */

  const openEdit = (row) => {
    navigate(`/users/${row.id}/edit`, {
      state: {
        role,
      },
    });
  };

  /* ==========================================================
     DEACTIVATE USER
  ========================================================== */

  const handleDeactivate = async () => {
    if (!confirmRow) return;

    try {
      await deactivateUser.mutateAsync(confirmRow.id);

      showToast(
        "User deactivated successfully",
        "success"
      );

      setConfirmRow(null);
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          "Operation failed",
        "error"
      );
    }
  };

  /* ==========================================================
     TABLE COLUMNS
  ========================================================== */

  const columns = [
    {
      key: "id",
      label: "ID",
      className:
        "w-[70px] min-w-[70px] text-center",
      headerClassName:
        "w-[70px] min-w-[70px] text-center",
      render: (row) => (
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-slate-100 px-2 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {row.id}
        </span>
      ),
    },

    {
      key: "username",
      label: "Username",
      className:
        "min-w-[180px] whitespace-nowrap",
      headerClassName:
        "min-w-[180px]",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-500/15 dark:text-primary-300">
            {(row.username || "U")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900 dark:text-white">
              {row.username || "-"}
            </p>

            <p className="text-xs text-slate-400 dark:text-slate-500">
              User #{row.id}
            </p>
          </div>
        </div>
      ),
    },

    {
      key: "email",
      label: "Email",
      className:
        "min-w-[230px]",
      headerClassName:
        "min-w-[230px]",
      render: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {row.email || "-"}
        </span>
      ),
    },

    {
      key: "mobile",
      label: "Mobile",
      className:
        "min-w-[150px] whitespace-nowrap",
      headerClassName:
        "min-w-[150px]",
      render: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {row.mobile || "-"}
        </span>
      ),
    },

    {
      key: "role",
      label: "Role",
      className:
        "w-[130px] min-w-[130px]",
      headerClassName:
        "w-[130px] min-w-[130px]",
      render: (row) => (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {row.role || "-"}
        </span>
      ),
    },

    {
      key: "status",
      label: "Status",
      className:
        "w-[120px] min-w-[120px]",
      headerClassName:
        "w-[120px] min-w-[120px]",
      render: (row) => (
        <Badge
          className={
            row.is_active
              ? "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-400"
          }
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              row.is_active
                ? "bg-emerald-500"
                : "bg-red-500"
            }`}
          />

          {row.is_active
            ? "Active"
            : "Inactive"}
        </Badge>
      ),
    },

    {
      key: "actions",
      label: "Actions",
      className:
        "w-[170px] min-w-[170px]",
      headerClassName:
        "w-[170px] min-w-[170px]",
      render: (row) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          {canEdit && (
            <button
              type="button"
              onClick={() => openEdit(row)}
              className="
                inline-flex
                items-center
                rounded-lg
                border
                border-slate-200
                bg-white
                px-3
                py-1.5
                text-xs
                font-semibold
                text-slate-700
                shadow-sm
                transition
                hover:border-primary-200
                hover:bg-primary-50
                hover:text-primary-700
                dark:border-slate-700
                dark:bg-slate-900
                dark:text-slate-200
                dark:hover:border-primary-500/30
                dark:hover:bg-primary-500/10
                dark:hover:text-primary-300
              "
            >
              Edit
            </button>
          )}

          {row.is_active && canDelete && (
            <button
              type="button"
              onClick={() =>
                setConfirmRow(row)
              }
              className="
                inline-flex
                items-center
                rounded-lg
                border
                border-red-100
                bg-red-50
                px-3
                py-1.5
                text-xs
                font-semibold
                text-red-600
                transition
                hover:border-red-200
                hover:bg-red-100
                dark:border-red-500/20
                dark:bg-red-500/10
                dark:text-red-400
                dark:hover:bg-red-500/20
              "
            >
              Deactivate
            </button>
          )}

          {!canEdit && !canDelete && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              No actions
            </span>
          )}
        </div>
      ),
    },
  ];

  /* ==========================================================
     SUMMARY
  ========================================================== */

  const totalUsers = data?.total || 0;

  const activeUsers =
    data?.items?.filter(
      (item) => item.is_active
    ).length || 0;

  const inactiveUsers =
    data?.items?.filter(
      (item) => !item.is_active
    ).length || 0;

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="w-full space-y-6">

      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                />
                <circle
                  cx="9"
                  cy="7"
                  r="4"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                />
              </svg>
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {pageTitle}
              </h1>

              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {pageDescription}
              </p>
            </div>
          </div>
        </div>

        {canAdd && (
          <Button
            type="button"
            onClick={openAdd}
            className="
              inline-flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-lg
              px-4
              py-2.5
              text-sm
              font-semibold
              shadow-sm
              sm:w-auto
            "
          >
            <span className="text-lg leading-none">
              +
            </span>

            {addButtonLabel}
          </Button>
        )}
      </div>

      {/* ======================================================
          SUMMARY CARDS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        {/* Total */}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Total
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {totalUsers}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {pageTitle.toLowerCase()} in system
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                />
                <circle
                  cx="9"
                  cy="7"
                  r="4"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Active */}

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                Active
              </p>

              <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {activeUsers}
              </p>

              <p className="mt-1 text-xs text-emerald-600/70 dark:text-emerald-400/70">
                Currently active
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
          </div>
        </div>

        {/* Inactive */}

        <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 shadow-sm dark:border-red-500/20 dark:bg-red-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-red-600 dark:text-red-400">
                Inactive
              </p>

              <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-400">
                {inactiveUsers}
              </p>

              <p className="mt-1 text-xs text-red-600/70 dark:text-red-400/70">
                Deactivated accounts
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          TABLE CARD
      ====================================================== */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">

        {/* ====================================================
            TOOLBAR
        ==================================================== */}

        <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/60 sm:px-5">

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">

            {/* Search */}

            <div className="w-full xl:max-w-md">
              <TableSearchBar
                value={value}
                onChange={(newValue) => {
                  setValue(newValue);
                  setPage(1);
                }}
                placeholder={`Search ${pageTitle.toLowerCase()}...`}
              />
            </div>

            {/* Export */}

            <div className="flex flex-wrap items-center gap-2">

              <button
                type="button"
                onClick={exportExcel}
                disabled={exporting}
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-lg
                  border
                  border-slate-200
                  bg-white
                  px-3
                  py-2
                  text-xs
                  font-semibold
                  text-slate-700
                  shadow-sm
                  transition
                  hover:border-slate-300
                  hover:bg-slate-50
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  dark:border-slate-700
                  dark:bg-slate-800
                  dark:text-slate-200
                  dark:hover:bg-slate-700
                "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
                  />
                </svg>

                Excel
              </button>

              <button
                type="button"
                onClick={exportPDF}
                disabled={exporting}
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-lg
                  border
                  border-slate-200
                  bg-white
                  px-3
                  py-2
                  text-xs
                  font-semibold
                  text-slate-700
                  shadow-sm
                  transition
                  hover:border-slate-300
                  hover:bg-slate-50
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  dark:border-slate-700
                  dark:bg-slate-800
                  dark:text-slate-200
                  dark:hover:bg-slate-700
                "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 2h9l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 2v6h6M8 13h8M8 17h6"
                  />
                </svg>

                PDF
              </button>
            </div>
          </div>
        </div>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {isError && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600 dark:border-red-900/30 dark:bg-red-500/10 dark:text-red-400">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs font-bold dark:bg-red-500/20">
                !
              </span>

              <span>
                Failed to load {pageTitle.toLowerCase()}.
                Please try again.
              </span>
            </div>
          </div>
        )}

        {/* ====================================================
            TABLE
        ==================================================== */}

        <div className="w-full overflow-x-auto">
          <DataTable
            columns={columns}
            data={data?.items || []}
            loading={isLoading}
          />
        </div>

        {/* ====================================================
            PAGINATION
        ==================================================== */}

        <div className="border-t border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/50">
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

      {/* ======================================================
          DEACTIVATE CONFIRMATION
      ====================================================== */}

      <ConfirmDialog
        open={!!confirmRow}
        onClose={() => setConfirmRow(null)}
        onConfirm={handleDeactivate}
        title="Deactivate User"
        message={
          confirmRow
            ? `Are you sure you want to deactivate "${confirmRow.username}"?`
            : "Are you sure you want to deactivate this user?"
        }
        confirmText="Deactivate"
        loading={deactivateUser.isPending}
      />
    </div>
  );
}