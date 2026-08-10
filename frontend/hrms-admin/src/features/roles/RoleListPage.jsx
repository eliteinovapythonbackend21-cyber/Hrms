import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useRoles, useCreateRole, useUpdateRole, useDeactivateRole } from "./useRoles";
import RoleForm from "./RoleForm";
import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useTableExport } from "@/hooks/useTableExport";
import { useToast } from "@/components/feedback/Toast";
import TableSearchBar from "@/components/table/TableSearchBar";
import TableToolbar from "@/components/table/TableToolbar";
import { rolesApi } from "@/api/roles.api";

const EXPORT_COLUMNS = [
  { header: "ID", accessor: (r) => r.id },
  { header: "Name", accessor: (r) => r.name },
  { header: "Category", accessor: (r) => r.category },
  { header: "Status", accessor: (r) => (r.is_active ? "Active" : "Inactive") },
];

// Master categories shown up front — driven by the backend `roles.category`
// column (Admin/HR/Employee/Finance), not name-matching, so custom roles
// created under a sub-master category are grouped correctly too.
const ROLE_CATEGORIES = [
  { key: "Admin", label: "Admin", description: "Full system access" },
  { key: "HR", label: "HR", description: "HR team and its sub-roles" },
  { key: "Employee", label: "Employee", description: "Employee self-service" },
  { key: "Finance", label: "Finance", description: "Accounts, expenses & vendors" },
];

const QUERY_PARAMS = { per_page: 100 };

export default function RoleListPage() {
  const { showToast } = useToast();
  const { value, setValue, debouncedValue } = useDebouncedSearch();

  const { data, isLoading, isError, isFetching, refetch } = useRoles(QUERY_PARAMS);

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: rolesApi.list,
    queryParams: QUERY_PARAMS,
    exportColumns: EXPORT_COLUMNS,
    filename: "roles",
    title: "Roles",
  });

  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deactivateRole = useDeactivateRole();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmRole, setConfirmRole] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);

  const allRoles = data?.items || [];
  const category = ROLE_CATEGORIES.find((c) => c.key === activeCategory) || null;

  const categoryCounts = useMemo(() => {
    const counts = {};
    ROLE_CATEGORIES.forEach((cat) => {
      counts[cat.key] = allRoles.filter((r) => r.category === cat.key).length;
    });
    return counts;
  }, [allRoles]);

  const scopedRoles = useMemo(() => {
    if (!category) return [];
    let rows = allRoles.filter((r) => r.category === category.key);
    if (debouncedValue) {
      const q = debouncedValue.toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    }
    return rows;
  }, [allRoles, category, debouncedValue]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setModalOpen(true);
  };

  const openCategory = (key) => {
    setActiveCategory(key);
    setValue("");
  };

  const backToCategories = () => {
    setActiveCategory(null);
    setValue("");
  };

  const handleSubmit = async (payload) => {
    try {
      if (editing) {
        await updateRole.mutateAsync({ id: editing.id, payload });
        showToast("Role updated", "success");
      } else {
        await createRole.mutateAsync(payload);
        showToast("Role created", "success");
      }
      setModalOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const handleDeactivate = async () => {
    if (!confirmRole) return;
    try {
      await deactivateRole.mutateAsync(confirmRole.id);
      showToast("Role deactivated", "success");
      setConfirmRole(null);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to deactivate", "error");
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
    { key: "actions", label: "Actions", render: (r) => r.actions || "-" },
    {
      key: "is_active",
      label: "Status",
      render: (r) => (
        <Badge className={r.is_active ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"}>
          {r.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "ops",
      label: "Actions",
      render: (r) => (
        <div className="flex items-center gap-2">
          <button onClick={() => openEdit(r)} className="text-primary-600 hover:underline text-sm">Edit</button>
          <Link to={`/roles/${r.id}/permissions`} className="text-primary-600 hover:underline text-sm">Permissions</Link>
          {r.is_active && (
            <button onClick={() => setConfirmRole(r)} className="text-red-600 hover:underline text-sm">Deactivate</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          {category ? (
            <>
              <button onClick={backToCategories} className="text-sm text-primary-600 hover:underline mb-1">
                ← Categories
              </button>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{category.label} Roles</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{category.description}</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Roles</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select a category to manage its roles</p>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar onRefresh={refetch} refreshing={isFetching} onExportExcel={exportExcel} onExportPDF={exportPDF} exporting={exporting} />
          <Button onClick={openCreate} className="w-full sm:w-auto">Add Role</Button>
        </div>
      </div>

      {isError && <div className="mb-4 text-red-600 dark:text-red-400">Failed to load roles.</div>}

      {!category ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ROLE_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => openCategory(cat.key)}
              className="card p-5 text-left border border-transparent hover:border-primary-500 dark:hover:border-primary-400 transition-colors"
            >
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{cat.label}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{cat.description}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                {isLoading ? "…" : `${categoryCounts[cat.key] || 0} role${(categoryCounts[cat.key] || 0) === 1 ? "" : "s"}`}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <TableSearchBar value={value} onChange={setValue} placeholder={`Search ${category.label.toLowerCase()} roles...`} />
          </div>
          <DataTable columns={columns} data={scopedRoles} loading={isLoading} />
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Role" : "Add Role"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="role-form" isLoading={createRole.isPending || updateRole.isPending}>
              {editing ? "Update" : "Create"}
            </Button>
          </>
        }
      >
        <RoleForm
          initialData={editing || {}}
          onSubmit={handleSubmit}
          loading={createRole.isPending || updateRole.isPending}
          lockedCategory={!editing && category ? category.label : null}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirmRole}
        onClose={() => setConfirmRole(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Role"
        message={`Are you sure you want to deactivate "${confirmRole?.name}"?`}
        confirmText="Deactivate"
        loading={deactivateRole.isPending}
      />
    </div>
  );
}
