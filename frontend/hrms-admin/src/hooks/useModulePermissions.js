import { useQuery } from "@tanstack/react-query";
import { rolesApi } from "@/api/roles.api";
import { getUser } from "@/utils/tokenHelpers";

// Row-level Add/Edit/Delete/View visibility for EVERY list screen —
// including Admin-section masters — is driven entirely by the logged-in
// user's RolePermission grants (category x action), fetched from
// GET /roles/permissions/catalog + GET /roles/<role_id>/permissions.
// There is no hardcoded admin bypass: the `admin` role is seeded with full
// grants across every category by migration, so it behaves the same as
// before by default, but that access is now data an admin can see/change
// from Admin > Roles & Permissions like any other role's.
export function useModulePermissions(moduleName) {
  const user = getUser();

  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ["permissions", "catalog"],
    queryFn: async () => (await rolesApi.permissionsCatalog()).data.data,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: grant, isLoading: grantLoading } = useQuery({
    queryKey: ["permissions", "role", user?.role_id],
    queryFn: async () => (await rolesApi.getRolePermissions(user.role_id)).data.data,
    enabled: !!user?.role_id,
    staleTime: 5 * 60 * 1000,
  });

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
