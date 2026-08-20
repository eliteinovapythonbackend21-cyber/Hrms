import { useState, useCallback } from "react";

import {
  exportToExcel as exportExcelFile,
  exportToPDF as exportPDFFile,
} from "@/utils/exportTable";

import { useToast } from "@/components/feedback/Toast";

export function useTableExport(options = {}) {
  const {
    fetchAll = null,
    queryParams = {},
    exportColumns = [],
    filename = "export",
    title = "",
  } = options;

  const { showToast } = useToast();

  const [exporting, setExporting] =
    useState(false);

  const exportToExcel = useCallback(
    async (
      rows = [],
      columns = [],
      fileName = "export"
    ) => {
      if (
        !Array.isArray(rows) ||
        rows.length === 0
      ) {
        showToast(
          "No data to export",
          "info"
        );
        return;
      }

      try {
        setExporting(true);

        exportExcelFile(
          fileName,
          columns,
          rows
        );
      } catch (error) {
        console.error(
          "Excel export failed:",
          error
        );

        showToast(
          "Failed to export data",
          "error"
        );
      } finally {
        setExporting(false);
      }
    },
    [showToast]
  );

  const exportToPDF = useCallback(
    async (
      rows = [],
      columns = [],
      fileName = "export",
      exportTitle = ""
    ) => {
      if (
        !Array.isArray(rows) ||
        rows.length === 0
      ) {
        showToast(
          "No data to export",
          "info"
        );
        return;
      }

      try {
        setExporting(true);

        exportPDFFile(
          fileName,
          exportTitle,
          columns,
          rows
        );
      } catch (error) {
        console.error(
          "PDF export failed:",
          error
        );

        showToast(
          "Failed to export data",
          "error"
        );
      } finally {
        setExporting(false);
      }
    },
    [showToast]
  );

  const getRows = useCallback(
    async () => {
      if (
        typeof fetchAll !== "function"
      ) {
        throw new Error(
          "fetchAll is required for fetch-based export"
        );
      }

      const response =
        await fetchAll({
          ...queryParams,
          page: 1,
          per_page: 5000,
        });

      return (
        response?.data?.data
          ?.items || []
      );
    },
    [fetchAll, queryParams]
  );

  const withRows = useCallback(
    async (run) => {
      setExporting(true);

      try {
        const rows =
          await getRows();

        if (!rows.length) {
          showToast(
            "No data to export",
            "info"
          );
          return;
        }

        run(rows);
      } catch (error) {
        console.error(
          "Export failed:",
          error
        );

        showToast(
          "Failed to export data",
          "error"
        );
      } finally {
        setExporting(false);
      }
    },
    [getRows, showToast]
  );

  const exportExcel = useCallback(
    () =>
      withRows((rows) =>
        exportExcelFile(
          filename,
          exportColumns,
          rows
        )
      ),
    [
      withRows,
      filename,
      exportColumns,
    ]
  );

  const exportPDF = useCallback(
    () =>
      withRows((rows) =>
        exportPDFFile(
          filename,
          title,
          exportColumns,
          rows
        )
      ),
    [
      withRows,
      filename,
      title,
      exportColumns,
    ]
  );

  return {
    exporting,
    exportToExcel,
    exportToPDF,
    exportExcel,
    exportPDF,
  };
}