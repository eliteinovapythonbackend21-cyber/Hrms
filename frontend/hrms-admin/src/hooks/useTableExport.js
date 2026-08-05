import { useState, useCallback } from "react";
import { exportToExcel, exportToPDF } from "@/utils/exportTable";
import { useToast } from "@/components/feedback/Toast";

// Exports the full filtered dataset (not just the current page) by re-running
// the list query with a large per_page, then handing the rows to the CSV/PDF
// writers. `fetchAll` is the raw axios list call (e.g. employeesApi.list) so
// this bypasses react-query's cached, paginated page of rows.
export function useTableExport({ fetchAll, queryParams, exportColumns, filename, title }) {
  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);

  const getRows = useCallback(async () => {
    const res = await fetchAll({ ...queryParams, page: 1, per_page: 5000 });
    return res.data.data.items || [];
  }, [fetchAll, queryParams]);

  const withRows = useCallback(
    async (run) => {
      setExporting(true);
      try {
        const rows = await getRows();
        if (!rows.length) {
          showToast("No data to export", "info");
          return;
        }
        run(rows);
      } catch {
        showToast("Failed to export data", "error");
      } finally {
        setExporting(false);
      }
    },
    [getRows, showToast]
  );

  const exportExcel = useCallback(
    () => withRows((rows) => exportToExcel(filename, exportColumns, rows)),
    [withRows, filename, exportColumns]
  );

  const exportPDF = useCallback(
    () => withRows((rows) => exportToPDF(filename, title, exportColumns, rows)),
    [withRows, filename, title, exportColumns]
  );

  return { exporting, exportExcel, exportPDF };
}
