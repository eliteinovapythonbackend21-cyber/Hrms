import { useEffect, useMemo, useState } from "react";

import {
  useCheckIn,
  useCheckOut,
  useAttendanceSettings,
} from "./useCheckInOut";
import { useAttendance } from "./useAttendance";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useToast } from "@/components/feedback/Toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { toDateInputValue, toTimeInputValue } from "@/utils/formatDate";
import { getUser } from "@/utils/tokenHelpers";

/* =========================================================
   HELPERS
========================================================= */

const now = new Date();
const today = toDateInputValue(now);

// "HH:MM" -> minutes since midnight
function hhmmToMinutes(value) {
  const [h, m] = String(value || "").split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
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

function ReasonPrompt({ open, title, hint, confirmLabel, loading, onConfirm, onClose }) {
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

  const [checkInTime, setCheckInTime] = useState(toTimeInputValue(now));
  const [checkOutTime, setCheckOutTime] = useState(toTimeInputValue(now));

  // { mode: "late" | "permission_out" | "permission_in" | "overtime" }
  const [prompt, setPrompt] = useState(null);

  useEffect(() => {
    getLocation();
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
  const openSession = lastEvent?.event_type === "check_in"; // currently "in"
  const onPermission =
    lastEvent?.event_type === "check_out" &&
    lastEvent?.reason_type === "permission";
  const doneForDay =
    lastEvent?.event_type === "check_out" && !onPermission;
  const notCheckedIn = !record || events.length === 0;

  const workStartMin = hhmmToMinutes(settings?.work_start_time || "10:00");
  const checkInMin = hhmmToMinutes(checkInTime);
  const wouldBeLate =
    notCheckedIn &&
    workStartMin != null &&
    checkInMin != null &&
    checkInMin > workStartMin;

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
        check_in: checkInTime,
        reason: reason || undefined,
        battery_percentage,
        ...baseGeo(),
        ...telemetry,
      });
      (res?.data?.warnings || []).forEach((w) => showToast(w, "warning"));
      showToast(
        onPermission ? "Checked back in from permission" : "Checked in",
        "success"
      );
      setPrompt(null);
      todayQuery.refetch();
    } catch (err) {
      showToast(err.response?.data?.message || "Check-in failed", "error");
    }
  };

  const doCheckOut = async ({ isPermission, reason, overtimeReason } = {}) => {
    if (!employeeId)
      return showToast("No employee record linked to this account", "error");
    try {
      const res = await checkOut.mutateAsync({
        employee_id: employeeId,
        attendance_date: attendanceDate,
        check_out: checkOutTime,
        is_permission: isPermission || undefined,
        reason: reason || undefined,
        overtime_reason: overtimeReason || undefined,
        ...baseGeo(),
      });
      (res?.data?.warnings || []).forEach((w) => showToast(w, "warning"));
      showToast(
        isPermission ? "Checked out for permission" : "Checked out for the day",
        "success"
      );
      setPrompt(null);
      todayQuery.refetch();
    } catch (err) {
      const data = err.response?.data;
      if (data?.requires === "overtime_reason") {
        // End-of-day checkout beyond the required hours — ask for a reason.
        setPrompt({ mode: "overtime" });
        showToast(data.message, "warning");
        return;
      }
      showToast(data?.message || "Check-out failed", "error");
    }
  };

  /* ---- button handlers ---- */
  const handleCheckIn = () => {
    if (onPermission) return setPrompt({ mode: "permission_in" });
    if (wouldBeLate) return setPrompt({ mode: "late" });
    doCheckIn();
  };

  const handleCheckOutForDay = () => doCheckOut({});
  const handleCheckOutForPermission = () =>
    setPrompt({ mode: "permission_out" });

  const confirmPrompt = (value) => {
    if (prompt?.mode === "late" || prompt?.mode === "permission_in") {
      doCheckIn(value);
    } else if (prompt?.mode === "permission_out") {
      doCheckOut({ isPermission: true, reason: value });
    } else if (prompt?.mode === "overtime") {
      doCheckOut({ overtimeReason: value });
    }
  };

  const promptConfig = useMemo(() => {
    switch (prompt?.mode) {
      case "late":
        return {
          title: "Late login reason",
          hint: `Login is after ${settings?.work_start_time || "10:00"} — a reason is required.`,
          confirmLabel: "Check In",
        };
      case "permission_out":
        return {
          title: "Permission — reason",
          hint: "You are checking out for permission. Enter the reason; check in again when you return.",
          confirmLabel: "Check Out",
        };
      case "permission_in":
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
  }, [prompt, settings, requiredHours]);

  const saving = checkIn.isPending || checkOut.isPending;

  return (
    <div className="card-elevated p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Check In / Check Out
        </h2>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
            onPermission
              ? "bg-amber-50 text-amber-700 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
              : openSession
              ? "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
              : doneForDay
              ? "bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-white/10 dark:text-slate-300"
              : "bg-rose-50 text-rose-700 ring-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
          }`}
        >
          {onPermission
            ? "On permission"
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
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryTile
            label="Working hrs"
            value={`${(record.working_hours ?? 0).toFixed(2)}h`}
            tone="emerald"
          />
          <SummaryTile
            label="Permission"
            value={`${Math.round(record.permission_minutes ?? 0)}/${permCap}m`}
            tone={record.permission_over_limit ? "rose" : "violet"}
          />
          <SummaryTile
            label="Late by"
            value={`${Math.round(record.late_login_minutes ?? 0)}m`}
            tone={record.late_login_minutes ? "amber" : "slate"}
          />
          <SummaryTile
            label="Overtime"
            value={`${(record.overtime_hours ?? 0).toFixed(2)}h`}
            tone={record.overtime_hours ? "amber" : "slate"}
          />
        </div>
      )}

      {/* TIME INPUTS */}
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Input
          label={onPermission ? "Return Check-In Time" : "Check In Time"}
          type="time"
          value={checkInTime}
          onChange={(e) => setCheckInTime(e.target.value)}
        />
        <Input
          label="Check Out Time"
          type="time"
          value={checkOutTime}
          onChange={(e) => setCheckOutTime(e.target.value)}
        />
      </div>

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

      {/* ACTIONS */}
      {doneForDay ? (
        <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600 dark:bg-white/[0.04] dark:text-slate-300">
          You have checked out for the day
          {record?.check_out
            ? ` at ${new Date(record.check_out).toLocaleTimeString()}`
            : ""}
          .
        </p>
      ) : openSession ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            variant="secondary"
            onClick={handleCheckOutForPermission}
            isLoading={saving}
            disabled={!employeeId}
            className="w-full"
          >
            Check out for permission
          </Button>
          <Button
            onClick={handleCheckOutForDay}
            isLoading={saving}
            disabled={!employeeId}
            className="w-full"
          >
            Check out for the day
          </Button>
        </div>
      ) : (
        <Button
          onClick={handleCheckIn}
          isLoading={saving}
          disabled={!employeeId}
          className="w-full"
        >
          {onPermission ? "Check in (back from permission)" : "Check In"}
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
