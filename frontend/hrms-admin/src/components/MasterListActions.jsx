import { useModulePermissions } from "@/hooks/useModulePermissions";

// Row actions for full-CRUD master-data lists (Edit + Delete/Deactivate).
// `module` gates Edit/Delete via the RolePermission matrix — including for
// admin, which has no hardcoded bypass; it's simply seeded with full grants
// across every category, editable like any other role from
// Admin > Roles & Permissions.
export default function MasterListActions({ row, onEdit, onDeactivate, module }) {
  const { canEdit, canDelete } = useModulePermissions(module);
  const isActive = row.status !== undefined ? row.status : (row.is_active !== undefined ? row.is_active : true);
  return (
    <div className="flex items-center gap-2">
      {canEdit && (
        <button onClick={() => onEdit(row)} className="text-primary-600 hover:underline text-sm">
          Edit
        </button>
      )}
      {isActive && canDelete && (
        <button onClick={() => onDeactivate(row)} className="text-red-600 hover:underline text-sm">
          Deactivate
        </button>
      )}
    </div>
  );
}
