// Renders a { label, value }[] as a divided definition list — the
// label/value row pattern shared by the Employee and User detail pages.
export default function DetailList({ rows = [] }) {
  return (
    <dl className="divide-y divide-slate-200 dark:divide-slate-700">
      {rows.map((row) => (
        <div key={row.label} className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
          <dt className="text-sm text-slate-500 dark:text-slate-400">{row.label}</dt>
          <dd className="text-sm font-medium text-slate-900 dark:text-white sm:text-right">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
