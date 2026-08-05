import { useState, useEffect } from "react";

// Best-effort browser/device telemetry for the NetworkStatus row the backend
// writes alongside a check-in. Any field that isn't available in the current
// browser is simply omitted rather than blocking the check-in.
export function useDeviceInfo() {
  const [batteryPercentage, setBatteryPercentage] = useState(null);

  useEffect(() => {
    if (!navigator.getBattery) return;
    let cancelled = false;
    navigator
      .getBattery()
      .then((battery) => {
        if (!cancelled) setBatteryPercentage(Math.round(battery.level * 100));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const deviceName =
    navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || undefined;
  const networkType = navigator.connection?.effectiveType || undefined;
  const isOnline = navigator.onLine;

  return { deviceName, networkType, batteryPercentage, isOnline };
}
