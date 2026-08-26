import LoadingSpinner from "../feedback/LoadingSpinner";

function SortIcon({ direction }) {
  return (
    <svg
      className={`h-3.5 w-3.5 transition-transform ${
        direction === "desc" ? "rotate-180" : ""
      } ${
        direction
          ? "text-primary-600 dark:text-primary-400"
          : "text-slate-400 dark:text-slate-500"
      }`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 15l7-7 7 7"
      />
    </svg>
  );
}

// Generic data table.
//
// columns:
// [
//   {
//     key,
//     label,
//     render?,
//     className?,
//     headerClassName?,
//     cellClassName?,
//     sortable?
//   }
// ]
//
// data: array of row objects
// loading: boolean
// emptyText: string shown when no rows
// sortBy/sortDir/onSort: wire in usePagination's toggleSort
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
      <div className="py-16 text-center text-slate-500 dark:text-slate-400">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      <table className="w-full table-fixed divide-y divide-slate-200 dark:divide-white/10">
        <thead className="bg-slate-50 dark:bg-white/[0.03]">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 ${
                  col.headerClassName ||
                  col.className ||
                  ""
                }`}
              >
                {col.sortable && onSort ? (
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                  >
                    {col.label}

                    <SortIcon
                      direction={
                        sortBy === col.key
                          ? sortDir
                          : null
                      }
                    />
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
            <tr
              key={row[rowKey]}
              className="transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 text-sm text-slate-700 dark:text-slate-200 ${
                    col.cellClassName ||
                    col.className ||
                    ""
                  }`}
                >
                  {col.render
                    ? col.render(row)
                    : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}