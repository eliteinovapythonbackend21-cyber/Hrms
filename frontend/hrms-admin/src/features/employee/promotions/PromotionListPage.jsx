import GenericListPage from "@/components/table/GenericListPage";
import PromotionForm from "./PromotionForm";
import { employeeLifecycleApi } from "@/api/employee.api";
import { usePromotions, useCreatePromotion, useDeactivatePromotion } from "./usePromotions";

const COLUMNS = [
  { key: "employee_id", label: "Employee ID" },
  { key: "from_designation_id", label: "From Designation" },
  { key: "to_designation_id", label: "To Designation" },
  { key: "effective_date", label: "Effective Date" },
];

export default function PromotionListPage() {
  return (
    <GenericListPage
        module="Promotions"
      title="Promotions"
      subtitle="Employee promotion history"
      columns={COLUMNS}
      api={employeeLifecycleApi.promotions}
      useList={usePromotions}
      useCreate={useCreatePromotion}
      useRemove={useDeactivatePromotion}
      filename="promotions"
      searchPlaceholder="Search by remarks..."
      FormComponent={PromotionForm}
      formTitle="Promotion"
      addLabel="Add Promotion"
      actionsMode="none"
      entityLabel="Promotion record"
    />
  );
}
