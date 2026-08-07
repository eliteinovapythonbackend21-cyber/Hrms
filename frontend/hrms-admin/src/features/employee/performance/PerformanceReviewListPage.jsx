import GenericListPage from "@/components/table/GenericListPage";
import PerformanceReviewForm from "./PerformanceReviewForm";
import { employeeLifecycleApi } from "@/api/employee.api";
import { usePerformanceReviews, useCreatePerformanceReview, useDeactivatePerformanceReview } from "./usePerformanceReviews";

const COLUMNS = [
  { key: "employee_id", label: "Employee ID" },
  { key: "review_period", label: "Review Period" },
  { key: "rating", label: "Rating" },
  { key: "remarks", label: "Remarks", render: (r) => r.remarks || "-" },
];

export default function PerformanceReviewListPage() {
  return (
    <GenericListPage
        module="Performance"
      title="Performance Reviews"
      subtitle="Employee performance review records"
      columns={COLUMNS}
      api={employeeLifecycleApi.performance}
      useList={usePerformanceReviews}
      useCreate={useCreatePerformanceReview}
      useRemove={useDeactivatePerformanceReview}
      filename="performance"
      searchPlaceholder="Search by review period..."
      FormComponent={PerformanceReviewForm}
      formTitle="Performance Review"
      addLabel="Add Review"
      actionsMode="none"
      entityLabel="Performance review"
    />
  );
}
