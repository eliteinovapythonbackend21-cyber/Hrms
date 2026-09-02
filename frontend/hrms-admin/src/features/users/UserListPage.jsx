import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import { useUsers, useDeactivateUser } from "./useUsers";

import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import ViewToggle, { useViewMode } from "@/components/table/ViewToggle";
import LoadingSpinner from "@/components/feedback/LoadingSpinner";

import { usePagination } from "@/hooks/usePagination";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useTableExport } from "@/hooks/useTableExport";
import { useToast } from "@/components/feedback/Toast";

import TableSearchBar from "@/components/table/TableSearchBar";
import TablePagination from "@/components/table/TablePagination";

import { usersApi } from "@/api/users.api";
import { useModulePermissions } from "@/hooks/useModulePermissions";

/* ============================================================
   EXPORT COLUMNS
============================================================ */

const EXPORT_COLUMNS = [
  { header: "ID", accessor: (row) => row.id },
  { header: "Username", accessor: (row) => row.username || "-" },
  { header: "Email", accessor: (row) => row.email || "-" },
  { header: "Mobile", accessor: (row) => row.mobile || "-" },
  { header: "Role", accessor: (row) => row.role || "-" },
  { header: "Status", accessor: (row) => (row.is_active ? "Active" : "Inactive") },
];

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ============================================================
   MOTION HOOKS
============================================================ */

/**
 * Advanced 3D pointer-tilt.
 * Drives CSS custom props on the element:
 *   --rx/--ry  rotation toward the cursor
 *   --scale    lift on hover
 *   --gx/--gy  glare hot-spot + edge sheen angle
 *   --glare    glare intensity
 *   --sx/--sy  direction-aware drop-shadow offset
 *   --px/--py  normalised pointer offset (-1..1) for inner parallax layers
 * Eases back to rest on leave; disabled under prefers-reduced-motion.
 */
function use3DTilt({ max = 14, scale = 1.04 } = {}) {
  const ref = useRef(null);
  const frame = useRef(0);

  const write = useCallback((v) => {
    const el = ref.current;
    if (!el) return;
    for (const k in v) el.style.setProperty(k, v[k]);
  }, []);

  const onMouseMove = useCallback(
    (e) => {
      if (REDUCED) return;
      const el = ref.current;
      if (!el) return;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5; // -0.5..0.5
        const ny = (e.clientY - r.top) / r.height - 0.5;
        write({
          "--rx": `${(-ny * max * 2).toFixed(2)}deg`,
          "--ry": `${(nx * max * 2).toFixed(2)}deg`,
          "--scale": String(scale),
          "--gx": `${((nx + 0.5) * 100).toFixed(1)}%`,
          "--gy": `${((ny + 0.5) * 100).toFixed(1)}%`,
          "--glare": "0.45",
          "--sx": `${(-nx * 26).toFixed(1)}px`,
          "--sy": `${(-ny * 26 + 20).toFixed(1)}px`,
          "--px": (nx * 2).toFixed(3),
          "--py": (ny * 2).toFixed(3),
        });
        el.dataset.tilting = "1";
      });
    },
    [max, scale, write]
  );

  const onMouseLeave = useCallback(() => {
    cancelAnimationFrame(frame.current);
    write({
      "--rx": "0deg",
      "--ry": "0deg",
      "--scale": "1",
      "--gx": "50%",
      "--gy": "50%",
      "--glare": "0",
      "--sx": "0px",
      "--sy": "18px",
      "--px": "0",
      "--py": "0",
    });
    if (ref.current) delete ref.current.dataset.tilting;
  }, [write]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return { ref, handlers: { onMouseMove, onMouseLeave } };
}

/** Magnetic pull toward the cursor for CTAs. */
function useMagnetic(strength = 0.35) {
  const ref = useRef(null);
  const onMouseMove = useCallback(
    (e) => {
      if (REDUCED) return;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * strength;
      const y = (e.clientY - r.top - r.height / 2) * strength;
      el.style.transform = `translate(${x}px, ${y}px)`;
    },
    [strength]
  );
  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = "translate(0,0)";
  }, []);
  return { ref, handlers: { onMouseMove, onMouseLeave } };
}

/** Cursor spotlight — writes --mx/--my on the container. */
function useSpotlight() {
  const ref = useRef(null);
  const onMouseMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
    el.style.setProperty("--spot", "1");
  }, []);
  const onMouseLeave = useCallback(() => {
    ref.current?.style.setProperty("--spot", "0");
  }, []);
  return { ref, handlers: { onMouseMove, onMouseLeave } };
}

/** Eased count-up. */
function useCountUp(target = 0, duration = 1000) {
  const [val, setVal] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (REDUCED) {
      setVal(target);
      return;
    }
    const start = performance.now();
    const s = from.current;
    let raf = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(s + (target - s) * e));
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/* ============================================================
   VISUALS
============================================================ */

/** Mini animated bar meter. */
function MiniMeter({ value, total, tone }) {
  const pct = total ? Math.min(100, (value / total) * 100) : 0;
  const bar = {
    emerald: "bg-emerald-500",
    red: "bg-red-500",
    slate: "bg-slate-400",
  }[tone];
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
      <div
        className={`h-full rounded-full ${bar}`}
        style={{
          width: `${pct}%`,
          transition: REDUCED ? "none" : "width 1s cubic-bezier(.22,1,.36,1)",
        }}
      />
    </div>
  );
}

/** Decorative dot-grid + fading gradient for panels. */
function GridPattern({ id = "grid" }) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <pattern id={id} width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" className="fill-slate-300/50 dark:fill-white/10" />
        </pattern>
        <radialGradient id={`${id}-fade`} cx="50%" cy="0%" r="90%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="70%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}-mask`}>
          <rect width="100%" height="100%" fill={`url(#${id}-fade)`} />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} mask={`url(#${id}-mask)`} />
    </svg>
  );
}

function StatusPill({ active }) {
  return (
    <Badge
      className={
        active
          ? "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
          : "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-400"
      }
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-emerald-500 u-pulse" : "bg-red-500"
        }`}
      />
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

function Avatar({ name, size = "md" }) {
  const dims = size === "lg" ? "h-12 w-12 text-base" : "h-9 w-9 text-sm";
  return (
    <div
      className={`u-float-layer flex ${dims} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 font-semibold text-white shadow-lg shadow-primary-500/25`}
    >
      {(name || "U").charAt(0).toUpperCase()}
    </div>
  );
}

function StatCard({ tone = "slate", label, value, hint, icon, meterTotal }) {
  const { ref, handlers } = use3DTilt({ max: 10, scale: 1.02 });
  const shown = useCountUp(Number(value) || 0);

  const grad = {
    slate: "from-slate-500/10 to-slate-500/0 border-slate-200 dark:border-white/10",
    emerald: "from-emerald-500/15 to-emerald-500/0 border-emerald-100 dark:border-emerald-500/20",
    red: "from-red-500/15 to-red-500/0 border-red-100 dark:border-red-500/20",
  };
  const valueTone = {
    slate: "text-slate-900 dark:text-white",
    emerald: "text-emerald-700 dark:text-emerald-400",
    red: "text-red-700 dark:text-red-400",
  };
  const labelTone = {
    slate: "text-slate-400 dark:text-slate-500",
    emerald: "text-emerald-600 dark:text-emerald-400",
    red: "text-red-600 dark:text-red-400",
  };
  const iconTone = {
    slate: "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    red: "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  };

  return (
    <div className="u-tilt-perspective">
      <div
        ref={ref}
        {...handlers}
        className={`u-tilt u-glare relative overflow-hidden rounded-xl border bg-white bg-gradient-to-br ${grad[tone]} p-4 shadow-sm dark:bg-white/[0.04]`}
      >
        <div className="u-tilt-content flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-medium uppercase tracking-wide ${labelTone[tone]}`}>
              {label}
            </p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${valueTone[tone]}`}>
              {shown}
            </p>
            <p className={`mt-1 text-xs ${labelTone[tone]}`}>{hint}</p>
            {meterTotal != null && (
              <MiniMeter value={Number(value) || 0} total={meterTotal} tone={tone} />
            )}
          </div>
          <div
            className={`u-float-layer ml-3 flex h-10 w-10 items-center justify-center rounded-lg ${iconTone[tone]}`}
          >
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Scoped keyframes + primitives. */
function MotionStyles() {
  return (
    <style>{`
      .u-tilt-perspective { perspective: 900px; perspective-origin: center; }
      .u-tilt {
        --rx:0deg; --ry:0deg; --scale:1; --sx:0px; --sy:18px; --px:0; --py:0;
        transform: rotateX(var(--rx)) rotateY(var(--ry)) scale(var(--scale)) translateZ(0);
        transform-style: preserve-3d;
        transition: transform .6s cubic-bezier(.16,1,.3,1), box-shadow .6s cubic-bezier(.16,1,.3,1);
        will-change: transform;
        box-shadow: 0 10px 25px -12px rgba(15,23,42,.18);
      }
      .u-tilt[data-tilting] {
        transition: transform .12s ease-out, box-shadow .2s ease-out;
        box-shadow: var(--sx) var(--sy) 45px -12px rgba(15,23,42,.38),
                    0 0 0 1px rgba(255,255,255,.04) inset;
      }
      /* moving light hot-spot */
      .u-glare::after {
        content:""; position:absolute; inset:0; pointer-events:none; border-radius:inherit;
        background: radial-gradient(180px circle at var(--gx,50%) var(--gy,50%),
          rgba(255,255,255,calc(var(--glare,0) * 1)), transparent 60%);
        transition: opacity .5s ease; mix-blend-mode: overlay; z-index:6;
      }
      /* directional edge sheen */
      .u-glare::before {
        content:""; position:absolute; inset:0; pointer-events:none; border-radius:inherit; z-index:5;
        background: linear-gradient(
          calc(var(--px) * 40deg + 120deg),
          rgba(255,255,255,calc(var(--glare,0) * .5)),
          transparent 40%);
        opacity:.9;
      }
      .u-tilt-content {
        transform: translateZ(45px) translate3d(calc(var(--px) * 6px), calc(var(--py) * 6px), 0);
        transform-style: preserve-3d;
        transition: transform .2s ease-out;
      }
      .u-float-layer {
        transform: translateZ(75px) translate3d(calc(var(--px) * 12px), calc(var(--py) * 12px), 0);
        transition: transform .2s ease-out;
      }

      .u-spotlight { position: relative; }
      .u-spotlight::before {
        content:""; position:absolute; inset:0; pointer-events:none; z-index:5; border-radius:inherit;
        opacity: var(--spot,0); transition: opacity .3s ease;
        background: radial-gradient(320px circle at var(--mx) var(--my),
          rgba(99,102,241,.10), transparent 70%);
      }

      @keyframes u-rise { from { opacity:0; transform: translateY(16px) scale(.97); } to { opacity:1; transform:none; } }
      .u-rise { animation: u-rise .55s cubic-bezier(.22,1,.36,1) both; }
      @keyframes u-pulse-k { 0%,100% { box-shadow:0 0 0 0 rgba(16,185,129,.55); } 50% { box-shadow:0 0 0 5px rgba(16,185,129,0); } }
      .u-pulse { border-radius:9999px; animation: u-pulse-k 2s ease-out infinite; }
      @keyframes u-float-k { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      .u-hover-float:hover .u-float-target { animation: u-float-k 2.4s ease-in-out infinite; }
      @keyframes u-aurora-k { 0% { transform: translate3d(-8%,-4%,0) rotate(0deg); } 50% { transform: translate3d(8%,6%,0) rotate(180deg); } 100% { transform: translate3d(-8%,-4%,0) rotate(360deg); } }
      .u-aurora { animation: u-aurora-k 22s ease-in-out infinite; }
      @keyframes u-shimmer-k { 100% { background-position: 200% 0; } }
      .u-skel {
        background: linear-gradient(90deg, rgba(148,163,184,.12) 25%, rgba(148,163,184,.28) 37%, rgba(148,163,184,.12) 63%);
        background-size: 200% 100%; animation: u-shimmer-k 1.4s ease-in-out infinite;
      }
      @media (prefers-reduced-motion: reduce) {
        .u-tilt,.u-tilt-content,.u-float-layer,.u-rise,.u-pulse,.u-aurora,.u-skel,.u-hover-float:hover .u-float-target {
          animation: none !important; transition: none !important; transform: none !important;
        }
        .u-glare::before,.u-glare::after { display: none !important; }
      }
    `}</style>
  );
}

function CardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]"
        >
          <div className="flex items-center gap-3">
            <div className="u-skel h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="u-skel h-3 w-2/3 rounded" />
              <div className="u-skel h-2.5 w-1/3 rounded" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="u-skel h-2.5 w-full rounded" />
            <div className="u-skel h-2.5 w-4/5 rounded" />
            <div className="u-skel h-2.5 w-3/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   PAGE
============================================================ */

export default function UserListPage({ role }) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { params, page, perPage, setPage, setPerPage } = usePagination();
  const { value, setValue, debouncedValue } = useDebouncedSearch();

  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useViewMode(`users:${role || "all"}:view`, "table");

  const queryParams = {
    ...params,
    search: debouncedValue || undefined,
    role: role || undefined,
    is_active:
      statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
  };

  const { data, isLoading, isError, isFetching, refetch } = useUsers(queryParams);
  const { canAdd, canEdit, canDelete } = useModulePermissions("Users");

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: usersApi.list,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename:
      role === "admin" ? "admins" : role === "employee" ? "employees" : "users",
    title:
      role === "admin" ? "Admins" : role === "employee" ? "Employees" : "Users",
  });

  const deactivateUser = useDeactivateUser();
  const [confirmRow, setConfirmRow] = useState(null);

  const magnet = useMagnetic(0.3);
  const spot = useSpotlight();

  const pageTitle =
    role === "admin" ? "Admins" : role === "employee" ? "Employees" : "Users";
  const pageDescription =
    role === "admin"
      ? "Manage administrator accounts and access"
      : role === "employee"
      ? "Manage employee user accounts and access"
      : "Manage user accounts and access";
  const addButtonLabel =
    role === "admin" ? "Add Admin" : role === "employee" ? "Add Employee" : "Add User";

  const openAdd = () => navigate("/users/new", { state: { role } });
  const openEdit = (row) => navigate(`/users/${row.id}/edit`, { state: { role } });

  const handleDeactivate = async () => {
    if (!confirmRow) return;
    try {
      await deactivateUser.mutateAsync(confirmRow.id);
      showToast("User deactivated successfully", "success");
      setConfirmRow(null);
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const rawItems = useMemo(() => data?.items || [], [data]);
  const items = useMemo(() => {
    if (statusFilter === "active") return rawItems.filter((r) => r.is_active);
    if (statusFilter === "inactive") return rawItems.filter((r) => !r.is_active);
    return rawItems;
  }, [rawItems, statusFilter]);

  const totalUsers = data?.total || 0;
  const activeUsers = rawItems.filter((i) => i.is_active).length;
  const inactiveUsers = rawItems.filter((i) => !i.is_active).length;
  const pageCount = rawItems.length;

  const hasFilters = Boolean(debouncedValue) || statusFilter !== "all";
  const clearFilters = () => {
    setValue("");
    setStatusFilter("all");
    setPage(1);
  };

  /* ---------------------- TABLE COLUMNS ---------------------- */
  const columns = [
    {
      key: "id",
      label: "ID",
      className: "w-[70px] min-w-[70px] text-center",
      headerClassName: "w-[70px] min-w-[70px] text-center",
      render: (row) => (
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-slate-100 px-2 text-xs font-semibold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
          {row.id}
        </span>
      ),
    },
    {
      key: "username",
      label: "User",
      className: "min-w-[220px] whitespace-nowrap",
      headerClassName: "min-w-[220px]",
      render: (row) => (
        <div className="group flex items-center gap-3">
          <div className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110">
            <Avatar name={row.username} />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900 transition-colors group-hover:text-primary-700 dark:text-white dark:group-hover:text-primary-300">
              {row.username || "-"}
            </p>
            <p className="truncate text-xs text-slate-400 dark:text-slate-500">
              {row.email || `User #${row.id}`}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "mobile",
      label: "Mobile",
      className: "min-w-[150px] whitespace-nowrap",
      headerClassName: "min-w-[150px]",
      render: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {row.mobile || "-"}
        </span>
      ),
    },
    {
      key: "role",
      label: "Role",
      className: "w-[130px] min-w-[130px]",
      headerClassName: "w-[130px] min-w-[130px]",
      render: (row) => (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700 transition-transform duration-200 hover:scale-105 dark:bg-white/[0.06] dark:text-slate-200">
          {row.role || "-"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      className: "w-[120px] min-w-[120px]",
      headerClassName: "w-[120px] min-w-[120px]",
      render: (row) => <StatusPill active={row.is_active} />,
    },
    {
      key: "actions",
      label: "Actions",
      className: "w-[170px] min-w-[170px]",
      headerClassName: "w-[170px] min-w-[170px]",
      render: (row) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          {canEdit && (
            <button
              type="button"
              onClick={() => openEdit(row)}
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 hover:shadow-md active:translate-y-0 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:border-primary-500/30 dark:hover:bg-primary-500/10 dark:hover:text-primary-300"
            >
              Edit
            </button>
          )}
          {row.is_active && canDelete && (
            <button
              type="button"
              onClick={() => setConfirmRow(row)}
              className="inline-flex items-center rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-100 hover:shadow-md active:translate-y-0 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
            >
              Deactivate
            </button>
          )}
          {!canEdit && !canDelete && (
            <span className="text-xs text-slate-400 dark:text-slate-500">No actions</span>
          )}
        </div>
      ),
    },
  ];

  const statusTabs = [
    { key: "all", label: "All", count: totalUsers },
    { key: "active", label: "Active", count: activeUsers },
    { key: "inactive", label: "Inactive", count: inactiveUsers },
  ];

  /* ---------------------- RENDER ---------------------- */
  return (
    <div className="w-full space-y-6">
      <MotionStyles />

      {/* ================= HERO HEADER (aurora bg) ================= */}
      <div className="u-rise relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <GridPattern id="hero-grid" />
        <div className="pointer-events-none absolute inset-0 -z-0 opacity-70 dark:opacity-50">
          <div className="u-aurora absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary-400/30 blur-3xl" />
          <div
            className="u-aurora absolute -right-24 top-0 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl"
            style={{ animationDelay: "-7s" }}
          />
          <div
            className="u-aurora absolute bottom-[-6rem] left-1/3 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl"
            style={{ animationDelay: "-14s" }}
          />
        </div>

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="u-hover-float flex items-center gap-3">
              <div className="u-float-target flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 text-white shadow-lg shadow-primary-500/30">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-6 w-6"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {pageTitle}
                </h1>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {pageDescription}
                </p>
              </div>
            </div>
          </div>

          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white/80 text-slate-600 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M20 9A8 8 0 0 0 6 5L4 7M4 15a8 8 0 0 0 14 4l2-2" />
              </svg>
            </button>

            {canAdd && (
              <div
                ref={magnet.ref}
                {...magnet.handlers}
                className="inline-block will-change-transform transition-transform duration-200"
              >
                <Button
                  type="button"
                  onClick={openAdd}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-md transition-transform duration-200 will-change-transform hover:shadow-xl sm:w-auto"
                >
                  <span className="text-lg leading-none transition-transform duration-300 group-hover:rotate-90">
                    +
                  </span>
                  {addButtonLabel}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= SUMMARY CARDS ================= */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          tone="slate"
          label="Total"
          value={totalUsers}
          hint={`${pageTitle.toLowerCase()} in system`}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          }
        />
        <StatCard
          tone="emerald"
          label="Active"
          value={activeUsers}
          hint="on this page"
          meterTotal={pageCount}
          icon={<span className="h-2.5 w-2.5 rounded-full bg-emerald-500 u-pulse" />}
        />
        <StatCard
          tone="red"
          label="Inactive"
          value={inactiveUsers}
          hint="on this page"
          meterTotal={pageCount}
          icon={<span className="h-2.5 w-2.5 rounded-full bg-red-500" />}
        />
      </div>

      {/* ================= TABLE CARD ================= */}
      <div
        ref={spot.ref}
        {...spot.handlers}
        className="u-spotlight u-rise overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
      >
        {/* -------- STATUS TABS -------- */}
        <div className="relative z-10 flex items-center gap-1 border-b border-slate-200 px-4 pt-3 dark:border-white/10 sm:px-5">
          {statusTabs.map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                }}
                className={`relative -mb-px inline-flex items-center gap-2 border-b-2 px-3 pb-3 pt-1 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "border-primary-600 text-primary-700 dark:border-primary-400 dark:text-primary-300"
                    : "border-transparent text-slate-500 hover:-translate-y-0.5 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
                <span
                  className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold transition-transform duration-200 ${
                    active
                      ? "scale-110 bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300"
                      : "bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* -------- TOOLBAR -------- */}
        <div className="relative z-10 border-b border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-white/10 dark:bg-white/[0.02] sm:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="w-full xl:max-w-md">
              <TableSearchBar
                value={value}
                onChange={(v) => {
                  setValue(v);
                  setPage(1);
                }}
                placeholder={`Search ${pageTitle.toLowerCase()}...`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ViewToggle mode={viewMode} onChange={setViewMode} />
              <button
                type="button"
                onClick={exportExcel}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
                </svg>
                Excel
              </button>
              <button
                type="button"
                onClick={exportPDF}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 2h9l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6M8 13h8M8 17h6" />
                </svg>
                PDF
              </button>
            </div>
          </div>

          {hasFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Filters:</span>
              {debouncedValue && (
                <span className="u-rise inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:ring-white/10">
                  &ldquo;{debouncedValue}&rdquo;
                  <button type="button" onClick={() => setValue("")} className="text-slate-400 transition-transform hover:scale-125 hover:text-slate-700 dark:hover:text-white">×</button>
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="u-rise inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium capitalize text-slate-600 ring-1 ring-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:ring-white/10">
                  {statusFilter}
                  <button type="button" onClick={() => setStatusFilter("all")} className="text-slate-400 transition-transform hover:scale-125 hover:text-slate-700 dark:hover:text-white">×</button>
                </span>
              )}
              <button type="button" onClick={clearFilters} className="text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400">
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* -------- ERROR -------- */}
        {isError && (
          <div className="relative z-10 border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600 dark:border-red-900/30 dark:bg-red-500/10 dark:text-red-400">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs font-bold dark:bg-red-500/20">!</span>
              <span>Failed to load {pageTitle.toLowerCase()}. Please try again.</span>
            </div>
          </div>
        )}

        {/* -------- CONTENT -------- */}
        {viewMode === "cards" ? (
          <div className="relative z-10 p-4 sm:p-5">
            {isLoading ? (
              <CardSkeleton />
            ) : items.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                No {pageTitle.toLowerCase()} found
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((row, i) => (
                  <UserCard
                    key={row.id}
                    row={row}
                    index={i}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onEdit={() => openEdit(row)}
                    onDeactivate={() => setConfirmRow(row)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="relative z-10 w-full overflow-x-auto">
            <DataTable
              columns={columns}
              data={items}
              loading={isLoading}
              emptyText={`No ${pageTitle.toLowerCase()} found`}
            />
          </div>
        )}

        {/* -------- PAGINATION -------- */}
        <div className="relative z-10 border-t border-slate-200 bg-slate-50/50 dark:border-white/10 dark:bg-white/[0.02]">
          <TablePagination
            page={page}
            pages={data?.pages || 1}
            total={data?.total || 0}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmRow}
        onClose={() => setConfirmRow(null)}
        onConfirm={handleDeactivate}
        title="Deactivate User"
        message={
          confirmRow
            ? `Are you sure you want to deactivate "${confirmRow.username}"?`
            : "Are you sure you want to deactivate this user?"
        }
        confirmText="Deactivate"
        loading={deactivateUser.isPending}
      />
    </div>
  );
}

/* ============================================================
   USER CARD — 3D tilt + glare + parallax layers + staggered rise
============================================================ */

function UserCard({ row, index, canEdit, canDelete, onEdit, onDeactivate }) {
  const { ref, handlers } = use3DTilt({ max: 16, scale: 1.05 });

  return (
    <div
      className="u-tilt-perspective u-rise"
      style={{ animationDelay: `${Math.min(index, 10) * 55}ms` }}
    >
      <div
        ref={ref}
        {...handlers}
        className="u-tilt u-glare group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-primary-400/25 to-transparent blur-2xl transition-opacity duration-500 group-hover:opacity-100 sm:opacity-0" />

        <div className="u-tilt-content flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={row.username} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900 dark:text-white">
                {row.username || "-"}
              </p>
              <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                User #{row.id}
              </p>
            </div>
          </div>
          <StatusPill active={row.is_active} />
        </div>

        <dl className="u-tilt-content mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-400 dark:text-slate-500">Email</dt>
            <dd className="truncate text-slate-700 dark:text-slate-200">{row.email || "-"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-400 dark:text-slate-500">Mobile</dt>
            <dd className="text-slate-700 dark:text-slate-200">{row.mobile || "-"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-400 dark:text-slate-500">Role</dt>
            <dd className="capitalize text-slate-700 dark:text-slate-200">{row.role || "-"}</dd>
          </div>
        </dl>

        {(canEdit || (row.is_active && canDelete)) && (
          <div className="u-float-layer mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-white/[0.06]">
            {canEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-primary-500/10"
              >
                Edit
              </button>
            )}
            {row.is_active && canDelete && (
              <button
                type="button"
                onClick={onDeactivate}
                className="inline-flex flex-1 items-center justify-center rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-100 hover:shadow-md dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
              >
                Deactivate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
