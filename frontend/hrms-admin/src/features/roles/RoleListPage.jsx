import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useRoles, useCreateRole } from "./useRoles";
import RoleForm from "./RoleForm";
import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useTableExport } from "@/hooks/useTableExport";
import { useToast } from "@/components/feedback/Toast";
import TableSearchBar from "@/components/table/TableSearchBar";
import TableToolbar from "@/components/table/TableToolbar";
import { rolesApi } from "@/api/roles.api";
import {
  use3DTilt,
  useMagnetic,
  Motion3DStyles,
  GridPattern,
} from "@/hooks/use3DMotion";

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

/* 3D tilt+glare category card. */
function CategoryCard({ cat, count, loading, index, onOpen }) {
  const { ref, handlers } = use3DTilt({ max: 10, scale: 1.02 });

  return (
    <div
      className="u-tilt-perspective u-rise"
      style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
    >
      <button
        ref={ref}
        {...handlers}
        onClick={onOpen}
        className="u-tilt u-glare card relative w-full overflow-hidden p-5 text-left border border-transparent hover:border-primary-500 dark:hover:border-primary-400"
      >
        <div className="u-tilt-content">
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{cat.label}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{cat.description}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
            {loading ? "…" : `${count || 0} role${(count || 0) === 1 ? "" : "s"}`}
          </p>
        </div>
      </button>
    </div>
  );
}

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
  const addMagnet = useMagnetic(0.25);

  const [modalOpen, setModalOpen] = useState(false);
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
      await createRole.mutateAsync(payload);
      showToast("Role created", "success");
      setModalOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
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
        <Badge className={r.is_active ? "inline-flex items-center gap-1.5 bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" : "inline-flex items-center gap-1.5 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"}>
          <span className={`h-1.5 w-1.5 rounded-full ${r.is_active ? "bg-emerald-500 u-pulse" : "bg-red-500"}`} />
          {r.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "ops",
      label: "Actions",
      render: (r) => (
        <Link to={`/roles/${r.id}/permissions`} className="text-primary-600 hover:underline text-sm">Permissions</Link>
      ),
    },
  ];

  return (
    <div>
      <Motion3DStyles />

      <div className="u-rise relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-primary-50/40 to-white p-4 shadow-sm dark:border-white/[0.08] dark:from-primary-500/[0.08] dark:via-white/[0.02] dark:to-transparent sm:flex-row sm:items-center sm:justify-between mb-6">
        <GridPattern id="roles-grid" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-500/15 blur-3xl" />

        <div className="relative">
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
        <div className="relative flex flex-wrap items-center gap-2">
          <TableToolbar onRefresh={refetch} refreshing={isFetching} onExportExcel={exportExcel} onExportPDF={exportPDF} exporting={exporting} />
          <div ref={addMagnet.ref} {...addMagnet.handlers} className="inline-block w-full will-change-transform sm:w-auto">
            <Button
              onClick={openCreate}
              className="w-full shadow-sm transition-shadow duration-200 hover:shadow-lg sm:w-auto"
            >
              Add Role
            </Button>
          </div>
        </div>
      </div>

      {isError && <div className="mb-4 text-red-600 dark:text-red-400">Failed to load roles.</div>}

      {!category ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ROLE_CATEGORIES.map((cat, i) => (
            <CategoryCard
              key={cat.key}
              cat={cat}
              count={categoryCounts[cat.key]}
              loading={isLoading}
              index={i}
              onOpen={() => openCategory(cat.key)}
            />
          ))}
        </div>
      ) : (
        <div className="u-rise card">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10">
            <TableSearchBar value={value} onChange={setValue} placeholder={`Search ${category.label.toLowerCase()} roles...`} />
          </div>
          <DataTable columns={columns} data={scopedRoles} loading={isLoading} />
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Role"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="role-form" isLoading={createRole.isPending}>
              Create
            </Button>
          </>
        }
      >
        <RoleForm
          onSubmit={handleSubmit}
          loading={createRole.isPending}
          lockedCategory={category ? category.label : null}
        />
      </Modal>
    </div>
  );
}
