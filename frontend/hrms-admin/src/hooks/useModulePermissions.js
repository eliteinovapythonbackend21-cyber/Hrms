import { useQuery } from "@tanstack/react-query";
import { rolesApi } from "@/api/roles.api";
import { getUser } from "@/utils/tokenHelpers";
import { isAdmin } from "@/constants/roles";

// Row-level Edit/Delete/Add visibility for non-Admin-section lists is driven
// by the logged-in user's RolePermission grants (module x action), not by
// role name or which shared action component a list happens to import.
// `admin` always gets full access regardless of the matrix, so a
// misconfigured/empty matrix can never lock the admin role out.
//
// Backend module strings (see migrations/versions/cf5ef8d585e8_..._.py):
// "Organization" | "Employee" | "CRM" | "Finance" | "Reports" | "HR".
export function useModulePermissions(moduleName) {
  const user = getUser();
  const admin = isAdmin(user);

  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ["permissions", "catalog"],
    queryFn: async () => (await rolesApi.permissionsCatalog()).data.data,
    enabled: !admin && !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: grant, isLoading: grantLoading } = useQuery({
    queryKey: ["permissions", "role", user?.role_id],
    queryFn: async () => (await rolesApi.getRolePermissions(user.role_id)).data.data,
    enabled: !admin && !!user?.role_id,
    staleTime: 5 * 60 * 1000,
  });

  if (admin) {
    return { canAdd: true, canEdit: true, canDelete: true, canView: true, loading: false };
  }

  const loading = !user || catalogLoading || grantLoading;
  if (loading || !catalog || !grant) {
    // Hide destructive/mutating actions until the matrix has actually
    // loaded, rather than flashing them and yanking them away.
    return { canAdd: false, canEdit: false, canDelete: false, canView: false, loading: true };
  }

  const grantedIds = new Set(grant.permission_ids || []);
  const has = (action) =>
    catalog.some((p) => p.module === moduleName && p.action === action && grantedIds.has(p.id));

  return {
    canAdd: has("add"),
    canEdit: has("edit"),
    canDelete: has("delete"),
    canView: has("view"),
    loading: false,
  };
}
