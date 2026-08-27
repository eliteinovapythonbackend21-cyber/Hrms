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
    accessor: (row) =>
      row.is_active ? "Active" : "Inactive",
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
      ? "Manage admin accounts"
      : role === "employee"
      ? "Manage employee accounts"
      : "Manage user accounts";

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


  /* ============================================================
     TABLE COLUMNS

     Layout:

     ID
     Username
     Email
     Mobile
     Role
     Status
     Actions
  ============================================================ */

  const columns = [
    {
      key: "id",
      label: "ID",
      className:
        "w-[80px] min-w-[80px] text-center",
      headerClassName:
        "w-[80px] min-w-[80px] text-center",
      render: (row) => (
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {row.id}
        </span>
      ),
    },

    {
      key: "username",
      label: "Username",
      className:
        "min-w-[160px] whitespace-nowrap",
      headerClassName:
        "min-w-[160px]",
      render: (row) => (
        <span className="font-medium text-slate-900 dark:text-white">
          {row.username || "-"}
        </span>
      ),
    },

    {
      key: "email",
      label: "Email",
      className:
        "min-w-[220px]",
      headerClassName:
        "min-w-[220px]",
      render: (row) => (
        <span className="text-slate-600 dark:text-slate-300">
          {row.email || "-"}
        </span>
      ),
    },

    {
      key: "mobile",
      label: "Mobile",
      className:
        "min-w-[140px] whitespace-nowrap",
      headerClassName:
        "min-w-[140px]",
      render: (row) => (
        <span className="text-slate-600 dark:text-slate-300">
          {row.mobile || "-"}
        </span>
      ),
    },

    {
      key: "role",
      label: "Role",
      className:
        "w-[120px] min-w-[120px]",
      headerClassName:
        "w-[120px] min-w-[120px]",
      render: (row) => (
        <span className="capitalize text-slate-700 dark:text-slate-200">
          {row.role || "-"}
        </span>
      ),
    },

    /* ========================================================
       STATUS
       Only status belongs in this column.
    ======================================================== */

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
              ? "inline-flex items-center justify-center whitespace-nowrap bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
              : "inline-flex items-center justify-center whitespace-nowrap bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
          }
        >
          {row.is_active
            ? "Active"
            : "Inactive"}
        </Badge>
      ),
    },

    /* ========================================================
       ACTIONS

       Keeping Actions separate gives the table a much
       cleaner and more consistent alignment.
    ======================================================== */

    {
      key: "actions",
      label: "Actions",
      className:
        "w-[180px] min-w-[180px]",
      headerClassName:
        "w-[180px] min-w-[180px]",
      render: (row) => (
        <div className="flex items-center gap-3 whitespace-nowrap">
          {canEdit && (
            <button
              type="button"
              onClick={() => openEdit(row)}
              className="
                text-sm
                font-medium
                text-primary-600
                hover:text-primary-700
                hover:underline
                dark:text-primary-400
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
                text-sm
                font-medium
                text-red-600
                hover:text-red-700
                hover:underline
                dark:text-red-400
                dark:hover:text-red-300
              "
            >
              Deactivate
            </button>
          )}

          {!canEdit && !canDelete && (
            <span className="text-sm text-slate-400 dark:text-slate-500">
              -
            </span>
          )}
        </div>
      ),
    },
  ];


  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="w-full">


      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div
        className="
          mb-6
          flex
          flex-col
          gap-4
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <div className="min-w-0">
          <h1
            className="
              text-2xl
              font-semibold
              text-slate-900
              dark:text-white
            "
          >
            {pageTitle}
          </h1>

          <p
            className="
              mt-1
              text-sm
              text-slate-500
              dark:text-slate-400
            "
          >
            {pageDescription}
          </p>
        </div>


        {/* ADD BUTTON */}

        {canAdd && (
          <Button
            type="button"
            onClick={openAdd}
            className="
              w-full
              shrink-0
              sm:w-auto
            "
          >
            {addButtonLabel}
          </Button>
        )}
      </div>


      {/* ======================================================
          TABLE CARD
      ====================================================== */}

      <div
        className="
          card
          w-full
          overflow-hidden
        "
      >


        {/* ====================================================
            SEARCH BAR
        ==================================================== */}

        <div
          className="
            border-b
            border-slate-200
            px-6
            py-4
            dark:border-slate-700
          "
        >
          <TableSearchBar
            value={value}
            onChange={setValue}
            placeholder="Search users..."
          />
        </div>


        {/* ====================================================
            ERROR
        ==================================================== */}

        {isError && (
          <div
            className="
              border-b
              border-red-100
              bg-red-50
              p-4
              text-sm
              text-red-600
              dark:border-red-900/30
              dark:bg-red-500/10
              dark:text-red-400
            "
          >
            Failed to load users.
          </div>
        )}


        {/* ====================================================
            TABLE

            overflow-x-auto prevents the columns from
            collapsing on smaller screens.
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

        <div
          className="
            border-t
            border-slate-200
            dark:border-slate-700
          "
        >
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
        onClose={() =>
          setConfirmRow(null)
        }
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