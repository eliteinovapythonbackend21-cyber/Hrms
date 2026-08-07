import { useModulePermissions } from "@/hooks/useModulePermissions";

// Row actions for add-only (create + soft-delete, no edit) transactional
// lists — employee lifecycle, CRM, and expense/income style records.
// `module` gates Delete via the RolePermission matrix; admin always passes.
export default function TransactionalListActions({ row, onDeactivate, extra, module }) {
  const { canDelete } = useModulePermissions(module);
  return (
    <div className="flex items-center gap-2">
      {extra}
      {row.is_active && canDelete && (
        <button onClick={() => onDeactivate(row)} className="text-red-600 hover:underline text-sm">
          Deactivate
        </button>
      )}
    </div>
  );
}
