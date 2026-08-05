// Pagination controls. total = total items, pages = total pages.
export default function TablePagination({
  page,
  pages,
  total,
  perPage,
  onPageChange,
  onPerPageChange,
}) {
  const options = [10, 20, 50, 100];

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <span>Rows per page:</span>
        <select
          value={perPage}
          onChange={(e) => onPerPageChange?.(Number(e.target.value))}
          className="input w-auto"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <span>
          {total} record{total === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange?.(page - 1)}
          disabled={page <= 1}
          className="btn-secondary px-3 py-1.5 disabled:opacity-40"
        >
          Prev
        </button>
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {page} / {pages || 1}
        </span>
        <button
          onClick={() => onPageChange?.(page + 1)}
          disabled={page >= pages}
          className="btn-secondary px-3 py-1.5 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
