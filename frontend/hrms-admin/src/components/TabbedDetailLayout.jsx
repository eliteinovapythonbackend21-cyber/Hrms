import { useState } from "react";

// Shared tabbed panel used by detail pages that need to surface several
// related read-only sub-lists (Employee profile: Documents / Performance /
// Training / Promotion-Transfer history; Customer profile: Follow-ups /
// Meetings / Quotations / Invoices / Payments / Support Tickets).
// tabs: [{ key, label, content }]
export default function TabbedDetailLayout({ tabs = [], defaultTab }) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active) || tabs[0];

  return (
    <div className="card">
      <div className="flex flex-wrap gap-1 px-4 pt-3 border-b border-slate-200 dark:border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`px-3 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
              activeTab?.key === tab.key
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-4">{activeTab?.content}</div>
    </div>
  );
}
