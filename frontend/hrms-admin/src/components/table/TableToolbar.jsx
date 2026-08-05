const RefreshIcon = ({ spinning }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const ExcelIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25V6.75A2.25 2.25 0 0111.25 4.5h6.5A2.25 2.25 0 0120 6.75v10.5A2.25 2.25 0 0117.75 19.5h-6.5A2.25 2.25 0 019 17.25zM9 9h11M9 15h11M4 6.75h5v10.5H4a1 1 0 01-1-1V7.75a1 1 0 011-1z" />
  </svg>
);

const PdfIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h4M9 8h1m-4.5 12h13a1.5 1.5 0 001.5-1.5V7.121a1.5 1.5 0 00-.44-1.06l-3.622-3.622a1.5 1.5 0 00-1.06-.439H5.5A1.5 1.5 0 004 3.5v15A1.5 1.5 0 005.5 20z" />
  </svg>
);

// Shared list-page toolbar: refresh the current query, and export the
// (currently filtered) dataset as CSV or PDF. Icon-only below `sm` so it
// stays usable in the tight header row on mobile.
export default function TableToolbar({ onRefresh, refreshing, onExportExcel, onExportPDF, exporting, className = "" }) {
  const btnClass =
    "inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-md text-sm font-medium border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <button type="button" onClick={onRefresh} disabled={refreshing} className={btnClass} title="Refresh">
        <RefreshIcon spinning={refreshing} />
        <span className="hidden sm:inline">Refresh</span>
      </button>
      <button type="button" onClick={onExportExcel} disabled={exporting} className={btnClass} title="Export as Excel/CSV">
        <ExcelIcon />
        <span className="hidden sm:inline">Excel</span>
      </button>
      <button type="button" onClick={onExportPDF} disabled={exporting} className={btnClass} title="Export as PDF">
        <PdfIcon />
        <span className="hidden sm:inline">PDF</span>
      </button>
    </div>
  );
}
