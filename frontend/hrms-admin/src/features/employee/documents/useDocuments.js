import { employeeLifecycleApi } from "@/api/employee.api";
import { useCrudList, useCrudCreate, useCrudUpdate, useCrudRemove } from "@/hooks/useCrudResource";

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
      total: activeItems.length,
    },
  };
};

export const useCreateDocument = () => useCrudCreate("employee-documents", api);
// NOTE: assumes useCrudUpdate exists in useCrudResource.js, mirroring
// useCrudList/useCrudCreate/useCrudRemove — used by the full-CRUD Master
// pages (Employees, Departments, etc.) via GenericListPage's `useUpdate`
// prop. If it's named differently, adjust this one import.
export const useUpdateDocument = () => useCrudUpdate("employee-documents", api);
export const useDeactivateDocument = () => useCrudRemove("employee-documents", api);

// ---------------------------------------------------------------------------
// Document Type list.
//
// NOTE: this used to also merge in "custom" types a person could add via a
// "+" button (stored in localStorage). That add-a-type UI has since been
// removed — the "+" next to a Document Type badge now opens Add Document
// instead. So this only returns the fixed list below. If you previously
// tested the old add-type flow, you may still have stray entries (e.g. a
// typo'd "Aadhar") sitting in your browser's localStorage under the key
// "hrms:custom-document-types" — those are no longer read here, but you can
// clear them via devtools (Application tab -> Local Storage) if needed.
// ---------------------------------------------------------------------------

const DOCUMENT_TYPES = [
  "Aadhaar",
  "Bank Details",
  "Experience Certificate",
  "School/College Mark Sheet",
  "Certificates",
];

export function getDocumentTypeOptions() {
  return DOCUMENT_TYPES.map((t) => ({ value: t, label: t }));
}