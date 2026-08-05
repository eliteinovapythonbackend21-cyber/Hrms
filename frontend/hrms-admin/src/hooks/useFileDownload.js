import { useCallback } from "react";

// Shared xlsx/blob download handler.
// Accepts the axios response (with responseType blob) and a filename.
export function useFileDownload() {
  const downloadBlob = useCallback((response, filename) => {
    const blob = response.data;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "download.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, []);

  return { downloadBlob };
}
