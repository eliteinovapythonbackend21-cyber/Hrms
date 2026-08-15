import { employeeLifecycleApi } from "@/api/employee.api";
import { useCrudList, useCrudCreate, useCrudRemove } from "@/hooks/useCrudResource";

const api = employeeLifecycleApi.documents;

// Deactivated documents (is_active = false) are soft-deleted, not removed —
// they're never shown in the list. Filtered client-side here so every
// consumer of this hook gets active-only records without touching
// GenericListPage or the API layer.
export const useDocuments = (params) => {
  const query = useCrudList("employee-documents", api, params);
  if (!query.data?.items) return query;

  const activeItems = query.data.items.filter((item) => item.is_active !== false);

  return {
    ...query,
    data: {
      ...query.data,
      items: activeItems,
      // Keep displayed totals consistent with what's actually shown.
      // Note: if the backend paginates before this filter runs, "total"
      // and "pages" still reflect the unfiltered server-side count — see
      // the note below for the more correct fix.
      total: activeItems.length,
    },
  };
};

export const useCreateDocument = () => useCrudCreate("employee-documents", api);
export const useDeactivateDocument = () => useCrudRemove("employee-documents", api);