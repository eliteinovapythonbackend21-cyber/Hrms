import { useEffect, useMemo, useState } from "react";

import {
  useCheckIn,
  useCheckOut,
  useAttendanceSettings,
  useResetAttendanceDay,
} from "./useCheckInOut";
import { useAttendance } from "./useAttendance";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useToast } from "@/components/feedback/Toast";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { toDateInputValue } from "@/utils/formatDate";
import { getUser } from "@/utils/tokenHelpers";

/* =========================================================
   CONSTANTS
========================================================= */

const now = new Date();
const today = toDateInputValue(now);

// Break / permission check-out options shown as emoji chips.
const BREAK_OPTIONS = [
  { type: "lunch", emoji: "🍽️", label: "Lunch" },
  { type: "tea", emoji: "☕", label: "Tea" },
  { type: "nap", emoji: "😴", label: "Nap" },
  { type: "permission", emoji: "🚶", label: "Permission" },
];

const BREAK_META = {
  nap: { emoji: "😴", label: "Nap break" },
  lunch: { emoji: "🍽️", label: "Lunch break" },
  tea: { emoji: "☕", label: "Tea break" },
  permission: { emoji: "🚶", label: "Permission" },
};

/* =========================================================
   HELPERS
========================================================= */

function hhmmToMinutes(value) {
  const [h, m] = String(value || "").split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
}

// Current wall-clock time as "HH:MM" (24h) — every check-in / check-out is
// stamped with this at the moment the button is pressed, never a value the
// employee typed.
function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function collectNetworkTelemetry() {
  const connection =
    typeof navigator !== "undefined" &&
    (navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection);

  return {
    device_name:
      typeof navigator !== "undefined"
        ? navigator.platform || navigator.userAgent
        : undefined,
    network_type: connection?.effectiveType,
    is_online:
      typeof navigator !== "undefined" ? navigator.onLine : undefined,
  };
}

async function getBatteryPercentage() {
  if (typeof navigator === "undefined" || !navigator.getBattery)
    return undefined;
  try {
    const battery = await navigator.getBattery();
    return Math.round(battery.level * 100);
  } catch {
    return undefined;
  }
}

/* =========================================================
   REASON PROMPT
========================================================= */

function ReasonPrompt({
  open,
  title,
  hint,
  confirmLabel,
  loading,
  onConfirm,
  onClose,
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-3">
        {hint && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{hint}</p>
        )}

        <textarea
          autoFocus
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter reason…"
          className="input w-full"
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            isLoading={loading}
            disabled={!value.trim()}
            onClick={() => onConfirm(value.trim())}
          >
            {confirmLabel || "Confirm"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================
   SUMMARY TILE
========================================================= */

function SummaryTile({ label, value, tone = "slate" }) {
  const tones = {
    slate: "text-slate-800 dark:text-slate-100",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
    violet: "text-violet-600 dark:text-violet-400",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${tones[tone]}`}>
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   WIDGET
========================================================= */

export default function CheckInOutWidget() {
  const { showToast } = useToast();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const resetDay = useResetAttendanceDay();
  const { data: settings } = useAttendanceSettings();

  const {
    coords,
    loading: geoLoading,
    error: geoError,
    getLocation,
  } = useGeolocation();

  const user = getUser();
  const employeeId = user?.employee?.id;
  const attendanceDate = today;

  // Live wall clock — display + "would be late" check only. The value
  // actually sent is computed fresh (nowHHMM) at the moment of the click.
  const [clock, setClock] = useState(nowHHMM());

  // { mode: "late" | "permission_out" | "permission_return" | "overtime" }
  const [prompt, setPrompt] = useState(null);

  useEffect(() => {
    getLocation();
    const id = setInterval(() => setClock(nowHHMM()), 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todayQuery = useAttendance(
    { employee_id: employeeId, attendance_date: attendanceDate },
    { enabled: !!employeeId }
  );
  const record = todayQuery.data?.items?.[0] || null;
  const events = record?.events || [];
  const lastEvent = events[events.length - 1] || null;

  /* ---- state machine ---- */
  const lastOutType =
    lastEvent?.event_type === "check_out" ? lastEvent.reason_type : null;
  const openSession = lastEvent?.event_type === "check_in"; // currently working
  const onPermission = lastOutType === "permission";
  const onBreak = ["nap", "lunch", "tea"].includes(lastOutType);
  const paused = onPermission || onBreak;
  const doneForDay = lastEvent?.event_type === "check_out" && !paused;
  const notCheckedIn = !record || events.length === 0;

  const workStartLabel = settings?.work_start_time || "10:00";
  const workStartMin = hhmmToMinutes(workStartLabel);
  const nowMin = hhmmToMinutes(clock);
  const wouldBeLate =
    notCheckedIn &&
    workStartMin != null &&
    nowMin != null &&
    nowMin > workStartMin;

  const permCap = settings?.max_permission_minutes_per_day ?? 60;
  const requiredHours = settings?.required_hours_per_day ?? 8;

  /* ---- submit helpers ---- */
  const baseGeo = () => ({
    latitude: coords.latitude,
    longitude: coords.longitude,
  });

  const doCheckIn = async (reason) => {
    if (!employeeId)
      return showToast("No employee record linked to this account", "error");
    try {
      const telemetry = collectNetworkTelemetry();
      const battery_percentage = await getBatteryPercentage();
      const res = await checkIn.mutateAsync({
        employee_id: employeeId,
        attendance_date: attendanceDate,
        // no explicit time — the server stamps the real current time
        reason: reason || undefined,
        battery_percentage,
        ...baseGeo(),
        ...telemetry,
      });
      (res?.data?.warnings || []).forEach((w) => showToast(w, "warning"));
      showToast(
        onPermission
          ? "Checked back in from permission"
          : onBreak
          ? `Back from ${BREAK_META[lastOutType]?.label || "break"}`
          : "Checked in",
        "success"
      );
      setPrompt(null);
      todayQuery.refetch();
    } catch (err) {
      const data = err.response?.data;
      if (data?.requires === "late_login_reason") {
        setPrompt({ mode: "late" });
        return;
      }
      if (data?.requires === "permission_return_reason") {
        setPrompt({ mode: "permission_return" });
        return;
      }
      showToast(data?.message || "Check-in failed", "error");
    }
  };

  const doCheckOut = async ({ breakType, reason, overtimeReason } = {}) => {
    if (!employeeId)
      return showToast("No employee record linked to this account", "error");
    try {
      const res = await checkOut.mutateAsync({
        employee_id: employeeId,
        attendance_date: attendanceDate,
        // no explicit time — the server stamps the real current time
        break_type: breakType || undefined,
        reason: reason || undefined,
        overtime_reason: overtimeReason || undefined,
        ...baseGeo(),
      });
      (res?.data?.warnings || []).forEach((w) => showToast(w, "warning"));
      showToast(
        breakType
          ? `${BREAK_META[breakType]?.emoji || ""} ${
              BREAK_META[breakType]?.label || "Break"
            } started — check in when you're back`
          : "Checked out for the day",
        "success"
      );
      setPrompt(null);
      todayQuery.refetch();
    } catch (err) {
      const data = err.response?.data;
      if (data?.requires === "overtime_reason") {
        setPrompt({ mode: "overtime" });
        showToast(data.message, "warning");
        return;
      }
      if (data?.requires === "permission_reason") {
        setPrompt({ mode: "permission_out" });
        return;
      }
      showToast(data?.message || "Check-out failed", "error");
    }
  };

  /* ---- button handlers ---- */
  const handleCheckIn = () => {
    if (onPermission) return setPrompt({ mode: "permission_return" });
    if (onBreak) return doCheckIn(); // returning from a break needs no reason
    if (wouldBeLate) return setPrompt({ mode: "late" });
    doCheckIn();
  };

  const handleBreak = (type) => {
    if (type === "permission") return setPrompt({ mode: "permission_out" });
    doCheckOut({ breakType: type });
  };

  const handleEndOfDay = () => doCheckOut({});

  const confirmPrompt = (value) => {
    if (prompt?.mode === "late" || prompt?.mode === "permission_return") {
      doCheckIn(value);
    } else if (prompt?.mode === "permission_out") {
      doCheckOut({ breakType: "permission", reason: value });
    } else if (prompt?.mode === "overtime") {
      doCheckOut({ overtimeReason: value });
    }
  };

  const promptConfig = useMemo(() => {
    switch (prompt?.mode) {
      case "late":
        return {
          title: "Late login — reason",
          hint: `Your check-in is after ${workStartLabel}. Enter the reason for the late login; it's saved with your attendance.`,
          confirmLabel: "Check In",
        };
      case "permission_out":
        return {
          title: "🚶 Permission — reason",
          hint: "You are checking out for permission. Enter the reason; check in again when you return.",
          confirmLabel: "Check Out",
        };
      case "permission_return":
        return {
          title: "Return from permission — reason",
          hint: "Enter the reason / note for returning from permission.",
          confirmLabel: "Check In",
        };
      case "overtime":
        return {
          title: "Additional working hours — reason",
          hint: `You worked beyond the required ${requiredHours} h — a reason is required.`,
          confirmLabel: "Check Out",
        };
      default:
        return {};
    }
  }, [prompt, workStartLabel, requiredHours]);

  const saving = checkIn.isPending || checkOut.isPending;

  const doReset = async () => {
    if (!employeeId || !record) return;
    if (
      !window.confirm(
        "Reset today's attendance? This clears every check-in / check-out and break for today so you can start over."
      )
    )
      return;
    try {
      await resetDay.mutateAsync({
        employee_id: employeeId,
        attendance_date: attendanceDate,
      });
      showToast("Today's attendance was reset — you can check in again", "success");
      setPrompt(null);
      todayQuery.refetch();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to reset attendance",
        "error"
      );
    }
  };

  return (
    <div className="card-elevated p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Check In / Check Out
        </h2>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
            paused
              ? "bg-amber-50 text-amber-700 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
              : openSession
              ? "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
              : doneForDay
              ? "bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-white/10 dark:text-slate-300"
              : "bg-rose-50 text-rose-700 ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
          }`}
        >
          {paused
            ? `${BREAK_META[lastOutType]?.emoji || ""} On ${
                BREAK_META[lastOutType]?.label || "break"
              }`
            : openSession
            ? "Checked in"
            : doneForDay
            ? "Done for today"
            : "Not checked in"}
        </span>
      </div>

      {!employeeId && (
        <p className="mb-4 text-sm text-amber-600 dark:text-amber-400">
          No employee record is linked to your account yet — ask an admin to
          link one before checking in.
        </p>
      )}

      {/* TODAY SUMMARY */}
      {record && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <SummaryTile
            label="Working"
            value={`${(record.working_hours ?? 0).toFixed(2)}h`}
            tone="emerald"
          />
          <SummaryTile
            label="Permission"
            value={`${Math.round(record.permission_minutes ?? 0)}/${permCap}m`}
            tone={record.permission_over_limit ? "rose" : "violet"}
          />
          <SummaryTile
            label="🍽️ Lunch"
            value={`${Math.round(record.lunch_minutes ?? 0)}m`}
          />
          <SummaryTile
            label="☕ Tea"
            value={`${Math.round(record.tea_minutes ?? 0)}m`}
          />
          <SummaryTile
            label="😴 Nap"
            value={`${Math.round(record.nap_minutes ?? 0)}m`}
          />
          <SummaryTile
            label="Late / OT"
            value={`${Math.round(record.late_login_minutes ?? 0)}m / ${(
              record.overtime_hours ?? 0
            ).toFixed(1)}h`}
            tone={
              record.late_login_minutes || record.overtime_hours
                ? "amber"
                : "slate"
            }
          />
        </div>
      )}

      {/* CURRENT TIME — check-in / check-out are always stamped "now" */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Current time
        </span>
        <span className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">
          {new Date(`2000-01-01T${clock}`).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
        Your check-in and check-out are recorded at the current time
        automatically.
      </p>

      <div className="mb-4">
        {geoLoading && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Detecting location…
          </p>
        )}
        {geoError && <p className="text-xs text-rose-500">{geoError}</p>}
        {coords.latitude && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Lat: {coords.latitude.toFixed(6)}, Lng:{" "}
            {coords.longitude.toFixed(6)}
          </p>
        )}
      </div>

      {record && !doneForDay && (
        <div className="mb-3 text-right">
          <button
            type="button"
            onClick={doReset}
            disabled={resetDay.isPending}
            className="text-[11px] font-medium text-slate-400 hover:text-rose-600 hover:underline disabled:opacity-50 dark:text-slate-500 dark:hover:text-rose-400"
          >
            {resetDay.isPending ? "Resetting…" : "Reset today's attendance"}
          </button>
        </div>
      )}

      {/* ACTIONS */}
      {doneForDay ? (
        <div className="space-y-2">
          <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600 dark:bg-white/[0.04] dark:text-slate-300">
            You have checked out for the day
            {record?.check_out
              ? ` at ${new Date(record.check_out).toLocaleTimeString()}`
              : ""}
            .
          </p>
          <button
            type="button"
            onClick={doReset}
            disabled={resetDay.isPending}
            className="text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50 dark:text-rose-400"
          >
            {resetDay.isPending
              ? "Resetting…"
              : "Made a mistake? Reset today's attendance"}
          </button>
        </div>
      ) : openSession ? (
        <div className="space-y-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Check out for a break / permission
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BREAK_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  disabled={!employeeId || saving}
                  onClick={() => handleBreak(opt.type)}
                  className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:border-primary-500/40 dark:hover:bg-primary-500/10"
                >
                  <span className="text-xl leading-none">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleEndOfDay}
            isLoading={saving}
            disabled={!employeeId}
            className="w-full"
          >
            🏁 Check out for the day
          </Button>
        </div>
      ) : (
        <Button
          onClick={handleCheckIn}
          isLoading={saving}
          disabled={!employeeId}
          className="w-full"
        >
          {paused
            ? `Check in — back from ${
                BREAK_META[lastOutType]?.label || "break"
              }`
            : "Check In"}
        </Button>
      )}

      <ReasonPrompt
        open={!!prompt}
        loading={saving}
        title={promptConfig.title}
        hint={promptConfig.hint}
        confirmLabel={promptConfig.confirmLabel}
        onConfirm={confirmPrompt}
        onClose={() => setPrompt(null)}
      />
    </div>
  );
}
