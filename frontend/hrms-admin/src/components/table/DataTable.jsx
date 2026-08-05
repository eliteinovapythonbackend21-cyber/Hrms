import LoadingSpinner from "../feedback/LoadingSpinner";

function SortIcon({ direction }) {
  return (
    <svg
      className={`h-3.5 w-3.5 transition-transform ${direction === "desc" ? "rotate-180" : ""} ${
        direction ? "text-primary-600 dark:text-primary-400" : "text-slate-400 dark:text-slate-500"
      }`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}

// Generic data table.
// columns: [{ key, label, render?, className?, sortable? }]
// data: array of row objects
// loading: boolean
// emptyText: string shown when no rows
// sortBy/sortDir/onSort: wire in usePagination's toggleSort for sortable columns
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyText = "No records found",
  rowKey = "id",
  sortBy,
  sortDir,
  onSort,
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500 dark:text-slate-400">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-white/10">
        <thead className="bg-slate-50 dark:bg-white/[0.03]">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-6 py-3 text-left text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider"
              >
                {col.sortable && onSort ? (
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                  >
                    {col.label}
                    <SortIcon direction={sortBy === col.key ? sortDir : null} />
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-white/10">
          {data.map((row) => (
            <tr key={row[rowKey]} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-200"
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
