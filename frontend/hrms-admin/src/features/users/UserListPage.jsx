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

const EXPORT_COLUMNS = [
  {
    header: "ID",
    accessor: (r) => r.id,
  },
  {
    header: "Username",
    accessor: (r) => r.username,
  },
  {
    header: "Email",
    accessor: (r) => r.email,
  },
  {
    header: "Mobile",
    accessor: (r) => r.mobile,
  },
  {
    header: "Role",
    accessor: (r) => r.role,
  },
  {
    header: "Status",
    accessor: (r) =>
      r.is_active ? "Active" : "Inactive",
  },
];

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

  /*
   * IMPORTANT
   *
   * Keep role in the API request.
   *
   * Admin:
   * /users/admins
   * role = admin
   *
   * Employee:
   * /users/employees
   * role = employee
   */
  const queryParams = {
    ...params,
    search: debouncedValue || undefined,
    role: role || undefined,
  };

  const {
    data,
    isLoading,
    isError,
  } = useUsers(queryParams);

  const {
    canAdd,
    canEdit,
    canDelete,
  } = useModulePermissions("Users");

  const {
    exporting,
    exportExcel,
    exportPDF,
  } = useTableExport({
    fetchAll: usersApi.list,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: role === "admin" ? "admins" : "employees",
    title: role === "admin" ? "Admins" : "Employees",
  });

  const deactivateUser = useDeactivateUser();

  const [confirmRow, setConfirmRow] = useState(null);

  /*
   * ADD USER
   *
   * Store the current role in navigation state.
   *
   * Admin -> Add User
   * state.role = admin
   *
   * Employee -> Add User
   * state.role = employee
   */
  const openAdd = () => {
    navigate("/users/new", {
      state: {
        role,
      },
    });
  };

  /*
   * EDIT USER
   *
   * Store the current list role.
   *
   * This allows UserFormPage to know which
   * list the user came from.
   */
  const openEdit = (row) => {
    navigate(`/users/${row.id}/edit`, {
      state: {
        role,
      },
    });
  };

  const handleDeactivate = async () => {
    if (!confirmRow) return;

    try {
      await deactivateUser.mutateAsync(confirmRow.id);

      showToast(
        "User deactivated",
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

  const columns = [
    {
      key: "id",
      label: "ID",
    },

    {
      key: "username",
      label: "Username",
    },

    {
      key: "email",
      label: "Email",
    },

    {
      key: "mobile",
      label: "Mobile",
    },

    {
      key: "role",
      label: "Role",
    },

    {
      key: "status",
      label: "Status",

      render: (r) => (
        <div className="flex items-center gap-3">
          <Badge
            className={
              r.is_active
                ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
            }
          >
            {r.is_active
              ? "Active"
              : "Inactive"}
          </Badge>

          {canEdit && (
            <button
              type="button"
              onClick={() => openEdit(r)}
              className="text-primary-600 hover:underline text-sm"
            >
              Edit
            </button>
          )}

          {r.is_active && canDelete && (
            <button
              type="button"
              onClick={() =>
                setConfirmRow(r)
              }
              className="text-red-600 hover:underline text-sm"
            >
              Deactivate
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* PAGE HEADER */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {role === "admin"
              ? "Admins"
              : role === "employee"
              ? "Employees"
              : "Users"}
          </h1>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            {role === "admin"
              ? "Manage admin accounts"
              : role === "employee"
              ? "Manage employee accounts"
              : "Manage user accounts"}
          </p>
        </div>

        {canAdd && (
          <Button
            type="button"
            onClick={openAdd}
            className="w-full sm:w-auto"
          >
            Add User
          </Button>
        )}
      </div>

      {/* USER TABLE */}

      <div className="card">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <TableSearchBar
            value={value}
            onChange={setValue}
            placeholder="Search users..."
          />
        </div>

        {isError && (
          <div className="p-4 text-red-600 dark:text-red-400">
            Failed to load users.
          </div>
        )}

        <DataTable
          columns={columns}
          data={data?.items || []}
          loading={isLoading}
        />

        <TablePagination
          page={page}
          pages={data?.pages || 1}
          total={data?.total || 0}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
        />
      </div>

      {/* DEACTIVATE CONFIRMATION */}

      <ConfirmDialog
        open={!!confirmRow}
        onClose={() =>
          setConfirmRow(null)
        }
        onConfirm={handleDeactivate}
        title="Deactivate User"
        message="Are you sure you want to deactivate this user?"
        confirmText="Deactivate"
        loading={
          deactivateUser.isPending
        }
      />
    </div>
  );
}