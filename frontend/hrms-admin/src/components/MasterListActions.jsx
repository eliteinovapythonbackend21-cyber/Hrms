import { useModulePermissions } from "@/hooks/useModulePermissions";

// Row actions for full-CRUD master-data lists (Edit + Delete/Deactivate).
// `module` gates Edit/Delete via the RolePermission matrix; admin always
// passes. Screens under the Admin nav section are admin-only via routing,
// so they don't need to pass `module` — the admin bypass covers them.
export default function MasterListActions({ row, onEdit, onDeactivate, module }) {
  const { canEdit, canDelete } = useModulePermissions(module);
  return (
    <div className="flex items-center gap-2">
      {canEdit && (
        <button onClick={() => onEdit(row)} className="text-primary-600 hover:underline text-sm">
          Edit
        </button>
      )}
      {row.is_active && canDelete && (
        <button onClick={() => onDeactivate(row)} className="text-red-600 hover:underline text-sm">
          Deactivate
        </button>
      )}
    </div>
  );
}
