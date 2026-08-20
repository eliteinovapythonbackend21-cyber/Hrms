import { useMemo, useState } from "react";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";

import { useToast } from "@/components/feedback/Toast";

import LeadForm from "./LeadForm";

import {
  useLeads,
  useCreateLead,
  useUpdateLead,
  useDeactivateLead,
  useReactivateLead,
  useConvertLead,
} from "./useLeads";

/* =========================================================
   CONSTANTS
========================================================= */

const PAGE_SIZE = 10;
const CARD_PAGE_SIZE = 6;

const PIPELINE_STATUS_OPTIONS = [
  { value: "", label: "All Pipeline Statuses" },
  { value: "New", label: "New" },
  { value: "Contacted", label: "Contacted" },
  { value: "Qualified", label: "Qualified" },
  { value: "Converted", label: "Converted" },
  { value: "Lost", label: "Lost" },
];

const STATUS_BADGE_CLASS = {
  New: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
  Contacted:
    "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  Qualified:
    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Converted:
    "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  Lost: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

function getStatusBadgeClass(status) {
  return (
    STATUS_BADGE_CLASS[status] ||
    STATUS_BADGE_CLASS.New
  );
}

// Filters on WHO CREATED (put in) the lead - i.e. which CRM sub-team
// generated it - not who it's currently assigned to.
const TEAM_TYPE_FILTER_OPTIONS = [
  { value: "", label: "All Teams" },
  { value: "Voice", label: "Voice" },
  { value: "Non-Voice", label: "Non-Voice" },
];

const TEAM_TYPE_BADGE_CLASS = {
  Voice:
    "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  "Non-Voice":
    "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
};

function getEmployeeDisplayName(
  employee
) {
  if (!employee) return "";
  return (
    `${employee.first_name || ""} ${
      employee.last_name || ""
    }`.trim() ||
    employee.employee_code ||
    ""
  );
}

/* =========================================================
   ICONS
========================================================= */

const PhoneIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-3.5 w-3.5 shrink-0 text-slate-400"
    fill="none"
    viewBox="0 0 20 20"
    stroke="currentColor"
    strokeWidth="1.4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 3h2.4l1 3.6-1.7 1.3a9 9 0 0 0 4.4 4.4l1.3-1.7 3.6 1v2.4c0 .8-.7 1.4-1.5 1.3A13 13 0 0 1 3.2 4.5c-.1-.8.5-1.5 1.3-1.5Z"
    />
  </svg>
);

const MailIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-3.5 w-3.5 shrink-0 text-slate-400"
    fill="none"
    viewBox="0 0 20 20"
    stroke="currentColor"
    strokeWidth="1.4"
  >
    <rect
      x="2.5"
      y="4.5"
      width="15"
      height="11"
      rx="1.5"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 5.5l7 5 7-5"
    />
  </svg>
);

const SourceIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-3.5 w-3.5 shrink-0 text-slate-400"
    fill="none"
    viewBox="0 0 20 20"
    stroke="currentColor"
    strokeWidth="1.4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 3v14M3 10h14"
    />
  </svg>
);

const UserSmallIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-3.5 w-3.5 shrink-0 text-slate-400"
    fill="none"
    viewBox="0 0 20 20"
    stroke="currentColor"
    strokeWidth="1.4"
  >
    <circle cx="10" cy="7" r="3" />
    <path
      strokeLinecap="round"
      d="M3.5 17c1-3.3 4-5 6.5-5s5.5 1.7 6.5 5"
    />
  </svg>
);

const LeadsStatIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8h6m-6 4h6"
    />
  </svg>
);

const ActiveStatIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  </svg>
);

const InactiveStatIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
    />
  </svg>
);

const ConvertedStatIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 12.75l6 6 9-13.5"
    />
  </svg>
);

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  value,
  label,
  tone = "sky",
}) {
  const tones = {
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    green:
      "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}
        >
          {icon}
        </div>

        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   CREATED-BY HIERARCHY BADGE ROW
   (shared markup between card and table views)
========================================================= */

function CreatorHierarchyRow({
  hierarchy,
}) {
  if (!hierarchy) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
      {hierarchy.department
        ?.department_name && (
        <span>
          {
            hierarchy.department
              .department_name
          }
        </span>
      )}

      {hierarchy.designation
        ?.designation_name && (
        <>
          <span className="text-slate-300 dark:text-slate-600">
            ›
          </span>
          <span>
            {
              hierarchy.designation
                .designation_name
            }
          </span>
        </>
      )}

      {hierarchy.team_type && (
        <span
          className={`ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
            TEAM_TYPE_BADGE_CLASS[
              hierarchy.team_type
            ] ||
            "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
          }`}
        >
          {hierarchy.team_type}
        </span>
      )}
    </div>
  );
}

/* =========================================================
   TABLE ICON BUTTON
========================================================= */

const IconButton = ({
  onClick,
  title,
  disabled,
  tone = "slate",
  children,
}) => {
  const tones = {
    slate:
      "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700",
    primary:
      "text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-500/10",
    red:
      "text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10",
    emerald:
      "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]}`}
    >
      {children}
    </button>
  );
};

/* =========================================================
   PAGE
========================================================= */

// LeadListPage renders leads as browsable cards (or a compact table),
// with its own search / status filters / pagination — no longer driven
// by GenericListPage. "Created By" (lead.creator / creator_hierarchy)
// is who actually put the lead into the system - used for the
// Voice / Non-Voice team filter - and is shown distinctly from
// "Assigned To" (lead.assignee), who is currently working the lead.
export default function LeadListPage() {
  const { showToast } =
    useToast();

  /* =======================================================
     DATA
  ======================================================= */

  const {
    data: allData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useLeads({
    page: 1,
    per_page: 1000,
  });

  const allLeads =
    allData?.items || [];

  /* =======================================================
     MUTATIONS
  ======================================================= */

  const createLead =
    useCreateLead();

  const updateLead =
    useUpdateLead();

  const deactivateLead =
    useDeactivateLead();

  const reactivateLead =
    useReactivateLead();

  const convertLead =
    useConvertLead();

  /* =======================================================
     PAGE STATE
  ======================================================= */

  const [search, setSearch] =
    useState("");

  const [
    pipelineStatusFilter,
    setPipelineStatusFilter,
  ] = useState("");

  const [
    activeFilter,
    setActiveFilter,
  ] = useState("active");

  const [
    teamTypeFilter,
    setTeamTypeFilter,
  ] = useState("");

  const [viewMode, setViewMode] =
    useState("card");

  const [page, setPage] =
    useState(1);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingLead, setEditingLead] =
    useState(null);

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const [confirmConvert, setConfirmConvert] =
    useState(null);

  /* =======================================================
     STATISTICS
  ======================================================= */

  const activeLeads = useMemo(
    () =>
      allLeads.filter(
        (lead) =>
          lead.is_active !== false
      ),
    [allLeads]
  );

  const inactiveLeads = useMemo(
    () =>
      allLeads.filter(
        (lead) =>
          lead.is_active === false
      ),
    [allLeads]
  );

  const convertedLeads = useMemo(
    () =>
      allLeads.filter(
        (lead) =>
          lead.status ===
          "Converted"
      ),
    [allLeads]
  );

  /* =======================================================
     FILTERED DATA
  ======================================================= */

  const filtered = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return allLeads.filter((lead) => {
      const isActive =
        lead.is_active !== false;

      if (
        activeFilter === "active" &&
        !isActive
      ) {
        return false;
      }

      if (
        activeFilter === "inactive" &&
        isActive
      ) {
        return false;
      }

      if (
        pipelineStatusFilter &&
        (lead.status || "New") !==
          pipelineStatusFilter
      ) {
        return false;
      }

      // Filters on the CREATOR's team, not the assignee's - this is
      // "which CRM sub-team generated the lead".
      if (
        teamTypeFilter &&
        lead.creator_hierarchy
          ?.team_type !==
          teamTypeFilter
      ) {
        return false;
      }

      if (normalizedSearch) {
        const haystack = [
          lead.lead_name,
          lead.contact_number,
          lead.email,
          lead.source,
          lead.status,
          getEmployeeDisplayName(
            lead.creator
          ),
          getEmployeeDisplayName(
            lead.assignee
          ),
        ]
          .join(" ")
          .toLowerCase();

        if (
          !haystack.includes(
            normalizedSearch
          )
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    allLeads,
    search,
    pipelineStatusFilter,
    activeFilter,
    teamTypeFilter,
  ]);

  /* =======================================================
     PAGINATION
  ======================================================= */

  const pageSize =
    viewMode === "card"
      ? CARD_PAGE_SIZE
      : PAGE_SIZE;

  const pageCount = Math.max(
    1,
    Math.ceil(
      filtered.length / pageSize
    )
  );

  const paged = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  /* =======================================================
     HANDLERS
  ======================================================= */

  const handleAdd = () => {
    setEditingLead(null);
    setModalOpen(true);
  };

  const handleEdit = (lead) => {
    setEditingLead(lead);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingLead(null);
  };

  const handleSubmit = async (
    payload
  ) => {
    try {
      const normalizedPayload = {
        ...payload,
        created_by:
          payload.created_by
            ? Number(
                payload.created_by
              )
            : null,
        assigned_to:
          payload.assigned_to
            ? Number(
                payload.assigned_to
              )
            : null,
      };

      if (editingLead) {
        await updateLead.mutateAsync(
          {
            id: editingLead.id,
            payload:
              normalizedPayload,
          }
        );

        showToast(
          "Lead updated",
          "success"
        );
      } else {
        await createLead.mutateAsync(
          normalizedPayload
        );

        showToast(
          "Lead created",
          "success"
        );
      }

      closeModal();

      await refetch();
    } catch (err) {
      /*
       * TEMP DEBUG: surface exactly what failed while tracking down
       * the Edit issue - check the browser console for the real
       * error (e.g. "api.update is not a function" would mean the
       * crmApi.leads method name doesn't match what useUpdateLead
       * expects). Remove once Edit is confirmed working.
       */
      console.error(
        "Lead save failed:",
        err
      );

      showToast(
        err?.response?.data
          ?.message ||
          err?.message ||
          "Operation failed",
        "error"
      );
    }
  };

  const confirmDeactivate =
    async () => {
      if (!deleteTarget) return;

      try {
        await deactivateLead.mutateAsync(
          deleteTarget.id
        );

        showToast(
          "Lead deactivated",
          "success"
        );

        setDeleteTarget(null);

        await refetch();
      } catch (err) {
        showToast(
          err?.response?.data
            ?.message ||
            "Failed to deactivate lead",
          "error"
        );
      }
    };

  const handleReactivate = async (
    lead
  ) => {
    if (!lead?.id) return;

    try {
      await reactivateLead.mutateAsync(
        lead.id
      );

      showToast(
        "Lead reactivated",
        "success"
      );

      await refetch();
    } catch (err) {
      showToast(
        err?.response?.data
          ?.message ||
          "Failed to reactivate lead",
        "error"
      );
    }
  };

  const handleConvert = async () => {
    if (!confirmConvert) return;

    try {
      await convertLead.mutateAsync({
        id: confirmConvert.id,
        payload: {},
      });

      showToast(
        "Lead converted to customer",
        "success"
      );

      setConfirmConvert(null);

      await refetch();
    } catch (err) {
      showToast(
        err?.response?.data
          ?.message ||
          "Failed to convert lead",
        "error"
      );
    }
  };

  const clearFilters = () => {
    setSearch("");
    setPipelineStatusFilter("");
    setTeamTypeFilter("");
    setActiveFilter("active");
    setPage(1);
  };

  const isSaving =
    createLead.isPending ||
    updateLead.isPending;

  const isMutating =
    deactivateLead.isPending ||
    reactivateLead.isPending;

  /* =======================================================
     ERROR
  ======================================================= */

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
        Failed to load leads.
      </div>
    );
  }

  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <div className="min-w-0 space-y-5">
      {/* HEADER */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Leads
          </h1>

          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Sales leads pipeline
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {isFetching
              ? "Refreshing..."
              : "Refresh"}
          </button>

          <Button
            type="button"
            onClick={handleAdd}
            className="h-10 w-full px-4 sm:w-auto"
          >
            <span className="mr-1.5 text-lg">
              +
            </span>
            Add Lead
          </Button>
        </div>
      </div>

      {/* STAT CARDS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<LeadsStatIcon />}
          value={allLeads.length}
          label="Total Leads"
          tone="sky"
        />

        <StatCard
          icon={<ActiveStatIcon />}
          value={activeLeads.length}
          label="Active Leads"
          tone="emerald"
        />

        <StatCard
          icon={<InactiveStatIcon />}
          value={
            inactiveLeads.length
          }
          label="Inactive Leads"
          tone="red"
        />

        <StatCard
          icon={
            <ConvertedStatIcon />
          }
          value={
            convertedLeads.length
          }
          label="Converted to Customer"
          tone="green"
        />
      </div>

      {/* FILTERS */}

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap">
            <div className="relative w-full sm:max-w-xs">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35m2.35-5.65a8 8 0 11-16 0 8 8 0 0116 0z"
                  />
                </svg>
              </span>

              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(
                    event.target.value
                  );
                  setPage(1);
                }}
                placeholder="Search by name, phone, email, or team member..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <select
              value={
                pipelineStatusFilter
              }
              onChange={(event) => {
                setPipelineStatusFilter(
                  event.target.value
                );
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[220px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              {PIPELINE_STATUS_OPTIONS.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>

            <select
              value={
                teamTypeFilter
              }
              onChange={(event) => {
                setTeamTypeFilter(
                  event.target.value
                );
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[160px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              title="Filter by which CRM sub-team created the lead"
            >
              {TEAM_TYPE_FILTER_OPTIONS.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>

            {(search ||
              pipelineStatusFilter ||
              teamTypeFilter ||
              activeFilter !==
                "active") && (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {[
                "active",
                "inactive",
                "all",
              ].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setActiveFilter(
                      status
                    );
                    setPage(1);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                    activeFilter ===
                    status
                      ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  setViewMode("card");
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === "card"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                Card
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode(
                    "table"
                  );
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === "table"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                Table
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DATA */}

      {isLoading ? (
        <div className="py-10 text-center text-sm text-slate-400">
          Loading...
        </div>
      ) : paged.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
            No leads found
          </h3>

          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            No records match your current search or filters.
          </p>
        </div>
      ) : viewMode === "card" ? (
        /* CARD VIEW */

        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paged.map((lead) => {
            const isActive =
              lead.is_active !==
              false;

            const canConvert =
              isActive &&
              lead.status !==
                "Converted";

            const actionCount =
              canConvert ? 3 : 2;

            return (
              <div
                key={lead.id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-900 ${
                  isActive
                    ? "border-slate-200 dark:border-slate-700"
                    : "border-red-100 dark:border-red-900/30"
                }`}
              >
                <div
                  className={`p-4 ${
                    !isActive
                      ? "opacity-75"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {lead.lead_name ||
                          "Untitled Lead"}
                      </p>

                      {lead.source && (
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                          <SourceIcon />
                          {lead.source}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge
                        className={getStatusBadgeClass(
                          lead.status
                        )}
                      >
                        {lead.status ||
                          "New"}
                      </Badge>

                      {!isActive && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
                          <span className="h-1 w-1 rounded-full bg-red-500" />
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <PhoneIcon />
                      <span className="truncate">
                        {lead.contact_number ||
                          "-"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MailIcon />
                      <span className="truncate">
                        {lead.email ||
                          "-"}
                      </span>
                    </div>

                    {lead.assignee && (
                      <div className="flex items-center gap-1.5">
                        <UserSmallIcon />
                        <span className="truncate">
                          Assigned to{" "}
                          {getEmployeeDisplayName(
                            lead.assignee
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {lead.creator && (
                    <div className="mt-2.5 rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/60">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                        Lead Created By
                      </p>

                      <p className="mt-0.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                        {getEmployeeDisplayName(
                          lead.creator
                        )}
                        {lead.creator
                          .employee_code
                          ? ` (${lead.creator.employee_code})`
                          : ""}
                      </p>

                      <div className="mt-1">
                        <CreatorHierarchyRow
                          hierarchy={
                            lead.creator_hierarchy
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className={`grid gap-px border-t border-slate-100 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 ${
                    actionCount === 3
                      ? "grid-cols-3"
                      : "grid-cols-2"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      handleEdit(
                        lead
                      )
                    }
                    className="bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Edit
                  </button>

                  {canConvert && (
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmConvert(
                          lead
                        )
                      }
                      className="bg-white py-2 text-xs font-semibold text-primary-600 hover:bg-primary-50 dark:bg-slate-900 dark:text-primary-400 dark:hover:bg-primary-500/10"
                    >
                      Convert
                    </button>
                  )}

                  {isActive ? (
                    <button
                      type="button"
                      disabled={
                        isMutating
                      }
                      onClick={() =>
                        setDeleteTarget(
                          lead
                        )
                      }
                      className="bg-white py-2 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-40 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        isMutating
                      }
                      onClick={() =>
                        handleReactivate(
                          lead
                        )
                      }
                      className="bg-white py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 dark:bg-slate-900 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */

        <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">
                  Lead Name
                </th>
                <th className="px-4 py-3 font-medium">
                  Contact
                </th>
                <th className="px-4 py-3 font-medium">
                  Source
                </th>
                <th className="px-4 py-3 font-medium">
                  Created By
                </th>
                <th className="px-4 py-3 font-medium">
                  Assigned To
                </th>
                <th className="px-4 py-3 font-medium">
                  Pipeline Status
                </th>
                <th className="px-4 py-3 font-medium">
                  Active
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paged.map((lead) => {
                const isActive =
                  lead.is_active !==
                  false;

                const canConvert =
                  isActive &&
                  lead.status !==
                    "Converted";

                return (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                      {lead.lead_name ||
                        "-"}
                    </td>

                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div>
                        {lead.contact_number ||
                          "-"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {lead.email ||
                          ""}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {lead.source ||
                        "-"}
                    </td>

                    <td className="px-4 py-3">
                      {lead.creator ? (
                        <div>
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                            {getEmployeeDisplayName(
                              lead.creator
                            )}
                          </p>

                          <CreatorHierarchyRow
                            hierarchy={
                              lead.creator_hierarchy
                            }
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 dark:text-slate-600">
                          —
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                      {lead.assignee
                        ? getEmployeeDisplayName(
                            lead.assignee
                          )
                        : (
                          <span className="text-slate-300 dark:text-slate-600">
                            —
                          </span>
                        )}
                    </td>

                    <td className="px-4 py-3">
                      <Badge
                        className={getStatusBadgeClass(
                          lead.status
                        )}
                      >
                        {lead.status ||
                          "New"}
                      </Badge>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isActive
                              ? "bg-emerald-500"
                              : "bg-red-500"
                          }`}
                        />
                        {isActive
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        <IconButton
                          title="Edit"
                          onClick={() =>
                            handleEdit(
                              lead
                            )
                          }
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.862 4.487l1.687-1.688a2.121 2.121 0 013 3l-9.9 9.9-4.137 1.034 1.034-4.137 9.9-9.9z"
                            />
                          </svg>
                        </IconButton>

                        {canConvert && (
                          <IconButton
                            title="Convert to Customer"
                            tone="primary"
                            onClick={() =>
                              setConfirmConvert(
                                lead
                              )
                            }
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4.5 12.75l6 6 9-13.5"
                              />
                            </svg>
                          </IconButton>
                        )}

                        {isActive ? (
                          <IconButton
                            title="Deactivate"
                            tone="red"
                            disabled={
                              isMutating
                            }
                            onClick={() =>
                              setDeleteTarget(
                                lead
                              )
                            }
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z"
                              />
                            </svg>
                          </IconButton>
                        ) : (
                          <IconButton
                            title="Reactivate"
                            tone="emerald"
                            disabled={
                              isMutating
                            }
                            onClick={() =>
                              handleReactivate(
                                lead
                              )
                            }
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 12a8 8 0 018-8 8.5 8.5 0 017 4M20 4v5h-5M20 12a8 8 0 01-8 8 8.5 8.5 0 01-7-4M4 20v-5h5"
                              />
                            </svg>
                          </IconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PAGINATION */}

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        <span>
          Page {page} of {pageCount}
        </span>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() =>
              setPage((current) =>
                Math.max(
                  1,
                  current - 1
                )
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            Previous
          </button>

          <button
            type="button"
            disabled={
              page >= pageCount
            }
            onClick={() =>
              setPage((current) =>
                Math.min(
                  pageCount,
                  current + 1
                )
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            Next
          </button>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={
          editingLead
            ? "Edit Lead"
            : "Add Lead"
        }
      >
        <LeadForm
          formId="leads-form"
          initialData={
            editingLead || {}
          }
          onSubmit={handleSubmit}
          loading={isSaving}
        />
      </Modal>

      {/* DEACTIVATE CONFIRM */}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() =>
          setDeleteTarget(null)
        }
        onConfirm={
          confirmDeactivate
        }
        title="Deactivate Lead"
        message={
          deleteTarget
            ? `Are you sure you want to deactivate "${deleteTarget.lead_name}"?`
            : ""
        }
        confirmText="Deactivate"
        loading={
          deactivateLead.isPending
        }
      />

      {/* CONVERT CONFIRM */}

      <ConfirmDialog
        open={!!confirmConvert}
        onClose={() =>
          setConfirmConvert(null)
        }
        onConfirm={handleConvert}
        title="Convert Lead to Customer"
        message={`Convert "${confirmConvert?.lead_name}" into a customer record?`}
        confirmText="Convert"
        confirmVariant="primary"
        loading={
          convertLead.isPending
        }
      />
    </div>
  );
}