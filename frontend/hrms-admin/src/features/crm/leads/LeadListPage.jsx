import { useState } from "react";
import GenericListPage from "@/components/table/GenericListPage";
import LeadForm from "./LeadForm";
import { crmApi } from "@/api/crm.api";
import { useLeads, useCreateLead, useDeactivateLead, useConvertLead } from "./useLeads";
import { useToast } from "@/components/feedback/Toast";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import Badge from "@/components/ui/Badge";

const COLUMNS = [
  { key: "lead_name", label: "Lead Name" },
  { key: "contact_number", label: "Contact", render: (r) => r.contact_number || "-" },
  { key: "email", label: "Email", render: (r) => r.email || "-" },
  { key: "source", label: "Source", render: (r) => r.source || "-" },
  {
    key: "status",
    label: "Status",
    render: (r) => (
      <Badge className={r.status === "Converted" ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300"}>
        {r.status || "New"}
      </Badge>
    ),
  },
];

// LeadListPage gets a distinct outlined "Convert to Customer" row action
// (not part of MasterListActions/TransactionalListActions — a workflow
// action calling POST /leads/<id>/convert) alongside the normal Delete.
export default function LeadListPage() {
  const { showToast } = useToast();
  const convertLead = useConvertLead();
  const [confirmConvert, setConfirmConvert] = useState(null);

  const handleConvert = async () => {
    if (!confirmConvert) return;
    try {
      await convertLead.mutateAsync({ id: confirmConvert.id, payload: {} });
      showToast("Lead converted to customer", "success");
      setConfirmConvert(null);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to convert lead", "error");
    }
  };

  return (
    <>
      <GenericListPage
        module="Leads"
        title="Leads"
        subtitle="Sales leads pipeline"
        columns={COLUMNS}
        api={crmApi.leads}
        useList={useLeads}
        useCreate={useCreateLead}
        useRemove={useDeactivateLead}
        filename="leads"
        searchPlaceholder="Search by name, phone, or email..."
        FormComponent={LeadForm}
        formTitle="Lead"
        addLabel="Add Lead"
        actionsMode="none"
        entityLabel="Lead"
        renderRowExtra={(row) =>
          row.status !== "Converted" ? (
            <button
              onClick={() => setConfirmConvert(row)}
              className="inline-flex items-center px-2.5 py-1 rounded-md border border-primary-500 text-primary-600 dark:text-primary-400 text-xs font-medium hover:bg-primary-50 dark:hover:bg-primary-500/10"
            >
              Convert to Customer
            </button>
          ) : null
        }
      />
      <ConfirmDialog
        open={!!confirmConvert}
        onClose={() => setConfirmConvert(null)}
        onConfirm={handleConvert}
        title="Convert Lead to Customer"
        message={`Convert "${confirmConvert?.lead_name}" into a customer record?`}
        confirmText="Convert"
        confirmVariant="primary"
        loading={convertLead.isPending}
      />
    </>
  );
}
