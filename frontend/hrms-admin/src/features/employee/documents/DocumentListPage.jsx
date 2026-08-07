import GenericListPage from "@/components/table/GenericListPage";
import DocumentForm from "./DocumentForm";
import { employeeLifecycleApi } from "@/api/employee.api";
import { useDocuments, useCreateDocument, useDeactivateDocument } from "./useDocuments";

const COLUMNS = [
  { key: "employee_id", label: "Employee ID" },
  { key: "doc_type", label: "Document Type" },
  { key: "file_url", label: "File URL", render: (r) => <a href={r.file_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">View</a> },
];

export default function DocumentListPage() {
  return (
    <GenericListPage
        module="Employee Documents"
      title="Employee Documents"
      subtitle="Documents uploaded per employee"
      columns={COLUMNS}
      api={employeeLifecycleApi.documents}
      useList={useDocuments}
      useCreate={useCreateDocument}
      useRemove={useDeactivateDocument}
      filename="employee-documents"
      searchPlaceholder="Search by document type..."
      FormComponent={DocumentForm}
      formTitle="Document"
      addLabel="Add Document"
      actionsMode="none"
      entityLabel="Document"
    />
  );
}
