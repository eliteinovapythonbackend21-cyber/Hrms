import { useState } from "react";
import { useCheckIn, useCheckOut } from "./useCheckInOut";
import { useAttendance } from "./useAttendance";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useToast } from "@/components/feedback/Toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { toDateInputValue, toTimeInputValue } from "@/utils/formatDate";
import { getUser } from "@/utils/tokenHelpers";

const now = new Date();

// Best-effort device/network telemetry the backend stores alongside every
// check-in (NetworkStatus row). All of these are optional browser APIs —
// omit rather than block the check-in when one isn't available.
function collectNetworkTelemetry() {
  const connection =
    typeof navigator !== "undefined" &&
    (navigator.connection || navigator.mozConnection || navigator.webkitConnection);

  return {
    device_name: typeof navigator !== "undefined" ? navigator.platform || navigator.userAgent : undefined,
    network_type: connection?.effectiveType,
    is_online: typeof navigator !== "undefined" ? navigator.onLine : undefined,
  };
}

async function getBatteryPercentage() {
  if (typeof navigator === "undefined" || !navigator.getBattery) return undefined;
  try {
    const battery = await navigator.getBattery();
    return Math.round(battery.level * 100);
  } catch {
    return undefined;
  }
}

export default function CheckInOutWidget() {
  const { showToast } = useToast();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const { coords, loading: geoLoading, error: geoError, getLocation } = useGeolocation();

  const user = getUser();
  const employeeId = user?.employee?.id;
  const [attendanceDate, setAttendanceDate] = useState(toDateInputValue(now));
  const [checkInTime, setCheckInTime] = useState(toTimeInputValue(now));
  const [checkOutTime, setCheckOutTime] = useState(toTimeInputValue(now));

  const todayQuery = useAttendance(
    { employee_id: employeeId, attendance_date: attendanceDate },
    { enabled: !!employeeId }
  );
  const todayRecord = todayQuery.data?.items?.[0];
  const alreadyCheckedIn = !!todayRecord?.check_in;
  const alreadyCheckedOut = !!todayRecord?.check_out;

  const handleCheckIn = async () => {
    if (!employeeId) {
      showToast("No employee record linked to this account", "error");
      return;
    }
    try {
      const telemetry = collectNetworkTelemetry();
      const battery_percentage = await getBatteryPercentage();
      await checkIn.mutateAsync({
        employee_id: employeeId,
        attendance_date: attendanceDate,
        check_in: checkInTime,
        latitude: coords.latitude,
        longitude: coords.longitude,
        battery_percentage,
        ...telemetry,
      });
      showToast("Checked in successfully", "success");
      todayQuery.refetch();
    } catch (err) {
      showToast(err.response?.data?.message || "Check-in failed", "error");
    }
  };

  const handleCheckOut = async () => {
    if (!employeeId) {
      showToast("No employee record linked to this account", "error");
      return;
    }
    try {
      await checkOut.mutateAsync({
        employee_id: employeeId,
        attendance_date: attendanceDate,
        check_out: checkOutTime,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      showToast("Checked out successfully", "success");
      todayQuery.refetch();
    } catch (err) {
      showToast(err.response?.data?.message || "Check-out failed", "error");
    }
  };

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Check In / Check Out
      </h2>

      {!employeeId && (
        <p className="mb-4 text-sm text-amber-600 dark:text-amber-400">
          No employee record is linked to your account yet — ask an admin to link one before checking in.
        </p>
      )}

      {alreadyCheckedIn && (
        <p className="mb-4 text-sm text-teal-700 dark:text-teal-300">
          {alreadyCheckedOut
            ? `Checked out for today at ${todayRecord.check_out ? new Date(todayRecord.check_out).toLocaleTimeString() : ""}.`
            : `Already checked in today at ${todayRecord.check_in ? new Date(todayRecord.check_in).toLocaleTimeString() : ""}.`}
        </p>
      )}

      <Input
        label="Attendance Date"
        type="date"
        value={attendanceDate}
        onChange={(e) => setAttendanceDate(e.target.value)}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Input
          label="Check In Time"
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
        <Button variant="secondary" onClick={getLocation} isLoading={geoLoading} className="w-full">
          {coords.latitude ? "Location Captured" : "Capture Location"}
        </Button>
        {geoError && <p className="mt-1 text-xs text-red-500">{geoError}</p>}
        {coords.latitude && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Lat: {coords.latitude.toFixed(6)}, Lng: {coords.longitude.toFixed(6)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Button
          onClick={handleCheckIn}
          isLoading={checkIn.isPending}
          disabled={!employeeId || alreadyCheckedIn}
          className="w-full"
        >
          {alreadyCheckedIn ? "Checked In" : "Check In"}
        </Button>
        <Button
          variant="secondary"
          onClick={handleCheckOut}
          isLoading={checkOut.isPending}
          disabled={!employeeId || !alreadyCheckedIn || alreadyCheckedOut}
          className="w-full"
        >
          {alreadyCheckedOut ? "Checked Out" : "Check Out"}
        </Button>
      </div>
    </div>
  );
}
