import { useMemo } from "react";

import { useNetworkLogs } from "./useNetworkLogs";

import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import { usePagination } from "@/hooks/usePagination";
import { useTableExport } from "@/hooks/useTableExport";
import TablePagination from "@/components/table/TablePagination";
import TableToolbar from "@/components/table/TableToolbar";
import { formatDateTime } from "@/utils/formatDate";
import { getUser } from "@/utils/tokenHelpers";
import { networkApi } from "@/api/network.api";

const EXPORT_COLUMNS = [
  {
    header: "Employee",
    accessor: (r) =>
      r.employee
        ? `${r.employee.first_name} ${r.employee.last_name}`.trim()
        : null,
  },
  {
    header: "Status",
    accessor: (r) => (r.is_online ? "Online" : "Offline"),
  },
  {
    header: "Network Type",
    accessor: (r) => r.network_type,
  },
  {
    header: "Device",
    accessor: (r) => r.device_name,
  },
  {
    header: "IP Address",
    accessor: (r) => r.ip_address,
  },
  {
    header: "Battery",
    accessor: (r) =>
      r.battery_percentage != null
        ? `${r.battery_percentage}%`
        : null,
  },
  {
    header: "Location",
    accessor: (r) =>
      r.latitude != null && r.longitude != null
        ? `${Number(r.latitude).toFixed(5)}, ${Number(
            r.longitude
          ).toFixed(5)}`
        : null,
  },
  {
    header: "Logged At",
    accessor: (r) => formatDateTime(r.created_at),
  },
];

export default function NetworkLogPage() {
  const {
    params,
    page,
    perPage,
    setPage,
    setPerPage,
  } = usePagination();

  const user = getUser();

  const isAdmin = user?.role === "admin";

  const queryParams = {
    ...params,
    employee_id:
      !isAdmin && user?.employee?.id
        ? user.employee.id
        : undefined,
  };

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useNetworkLogs(queryParams);

  const {
    exporting,
    exportExcel,
    exportPDF,
  } = useTableExport({
    fetchAll: networkApi.list,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "network-logs",
    title: "Network Logs",
  });

  const records = data?.items || [];

  /* ============================================================
     STATISTICS
  ============================================================ */

  const statistics = useMemo(() => {
    const total = data?.total ?? records.length;

    const online = records.filter(
      (item) => item.is_online === true
    ).length;

    const offline = records.filter(
      (item) => item.is_online === false
    ).length;

    const batteryRecords = records.filter(
      (item) => item.battery_percentage != null
    );

    const averageBattery =
      batteryRecords.length > 0
        ? Math.round(
            batteryRecords.reduce(
              (sum, item) =>
                sum + Number(item.battery_percentage),
              0
            ) / batteryRecords.length
          )
        : 0;

    const wifi = records.filter((item) =>
      String(item.network_type || "")
        .toLowerCase()
        .includes("wifi")
    ).length;

    const mobile = records.filter((item) => {
      const type = String(
        item.network_type || ""
      ).toLowerCase();

      return (
        type.includes("mobile") ||
        type.includes("cellular") ||
        type.includes("4g") ||
        type.includes("5g")
      );
    }).length;

    const locationAvailable = records.filter(
      (item) =>
        item.latitude != null &&
        item.longitude != null
    ).length;

    const onlinePercentage =
      total > 0
        ? Math.round((online / total) * 100)
        : 0;

    const offlinePercentage =
      total > 0
        ? Math.round((offline / total) * 100)
        : 0;

    const locationPercentage =
      total > 0
        ? Math.round(
            (locationAvailable / total) * 100
          )
        : 0;

    return {
      total,
      online,
      offline,
      averageBattery,
      wifi,
      mobile,
      locationAvailable,
      onlinePercentage,
      offlinePercentage,
      locationPercentage,
    };
  }, [data, records]);

  /* ============================================================
     TABLE COLUMNS
  ============================================================ */

  const columns = [
    {
      key: "employee",
      label: "Employee",
      className: "min-w-[180px]",
      render: (r) => {
        if (!r.employee) {
          return (
            <span className="text-slate-400 dark:text-slate-500">
              Unknown Employee
            </span>
          );
        }

        const name =
          `${r.employee.first_name || ""} ${
            r.employee.last_name || ""
          }`.trim();

        const initials =
          name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((word) =>
              word[0]?.toUpperCase()
            )
            .join("") || "U";

        return (
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
                {initials}
              </div>

              <span
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                  r.is_online
                    ? "bg-green-500"
                    : "bg-slate-400"
                }`}
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {name || "-"}
              </p>

              <p className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
                {r.employee.employee_code ||
                  `Employee #${r.employee.id || "-"}`}
              </p>
            </div>
          </div>
        );
      },
    },

    {
      key: "is_online",
      label: "Status",
      className: "min-w-[115px]",
      render: (r) => (
        <Badge
          className={
            r.is_online
              ? "inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-500/15 dark:text-green-300"
              : "inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300"
          }
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              r.is_online
                ? "bg-green-500"
                : "bg-red-500"
            }`}
          />

          {r.is_online ? "Online" : "Offline"}
        </Badge>
      ),
    },

    {
      key: "network_type",
      label: "Network",
      className: "min-w-[120px]",
      render: (r) => {
        const type = r.network_type || "-";

        const normalized =
          String(type).toLowerCase();

        const isWifi =
          normalized.includes("wifi");

        return (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10">
              {isWifi ? (
                <svg
                  className="h-4 w-4 text-blue-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M5 12.5a11 11 0 0 1 14 0" />
                  <path d="M8.5 16a6 6 0 0 1 7 0" />
                  <path d="M12 19.5h.01" />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4 text-blue-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect
                    x="6"
                    y="3"
                    width="12"
                    height="18"
                    rx="2"
                  />
                  <path d="M9 18h6" />
                </svg>
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                {type}
              </p>

              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {isWifi
                  ? "Wireless"
                  : "Mobile / Other"}
              </p>
            </div>
          </div>
        );
      },
    },

    {
      key: "device_name",
      label: "Device",
      className: "min-w-[130px]",
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
            {r.device_name || "Unknown Device"}
          </p>

          <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
            Check-in device
          </p>
        </div>
      ),
    },

    {
      key: "ip_address",
      label: "IP Address",
      className: "min-w-[125px]",
      render: (r) => (
        <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
          {r.ip_address || "-"}
        </span>
      ),
    },

    {
      key: "battery_percentage",
      label: "Battery",
      className: "min-w-[120px]",
      render: (r) => {
        if (r.battery_percentage == null) {
          return (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Not available
            </span>
          );
        }

        const battery = Math.min(
          Math.max(
            Number(r.battery_percentage),
            0
          ),
          100
        );

        let barClass = "bg-green-500";
        let textClass =
          "text-green-600 dark:text-green-400";

        if (battery <= 20) {
          barClass = "bg-red-500";
          textClass =
            "text-red-600 dark:text-red-400";
        } else if (battery <= 40) {
          barClass = "bg-amber-500";
          textClass =
            "text-amber-600 dark:text-amber-400";
        }

        return (
          <div className="w-[105px]">
            <div className="mb-1 flex items-center justify-between">
              <span
                className={`text-xs font-bold ${textClass}`}
              >
                {battery}%
              </span>

              <span className="text-[9px] text-slate-400">
                Battery
              </span>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={`h-full rounded-full ${barClass}`}
                style={{
                  width: `${battery}%`,
                }}
              />
            </div>
          </div>
        );
      },
    },

    {
      key: "coordinates",
      label: "Location",
      className: "min-w-[145px]",
      render: (r) => {
        const hasLocation =
          r.latitude != null &&
          r.longitude != null;

        if (!hasLocation) {
          return (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/[0.06]">
                <svg
                  className="h-4 w-4 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
                </svg>
              </div>

              <span className="text-xs text-slate-400">
                Unavailable
              </span>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
              <svg
                className="h-4 w-4 text-indigo-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </div>

            <div>
              <p className="font-mono text-[11px] font-medium text-slate-600 dark:text-slate-300">
                {Number(r.latitude).toFixed(5)}
              </p>

              <p className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                {Number(r.longitude).toFixed(5)}
              </p>
            </div>
          </div>
        );
      },
    },

    {
      key: "created_at",
      label: "Logged At",
      className: "min-w-[145px]",
      render: (r) => (
        <div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {formatDateTime(r.created_at)}
          </p>

          <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
            Network activity
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/10">
              <svg
                className="h-6 w-6 text-blue-600 dark:text-blue-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <path d="M5 12.55a11 11 0 0 1 14 0" />
                <path d="M8.5 16a6 6 0 0 1 7 0" />
                <path d="M12 19.5h.01" />
              </svg>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Network Logs
                </h1>

                <Badge className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  Monitoring
                </Badge>
              </div>

              <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                Monitor employee network connectivity,
                device information, battery status and
                location activity captured during check-ins.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  {statistics.online} Online
                </span>

                <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  {statistics.offline} Offline
                </span>

                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {statistics.total} Total Logs
                </span>
              </div>
            </div>
          </div>

          <TableToolbar
            onRefresh={refetch}
            refreshing={isFetching}
            onExportExcel={exportExcel}
            onExportPDF={exportPDF}
            exporting={exporting}
          />
        </div>
      </div>

      {/* ======================================================
          KPI CARDS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Logs
              </p>

              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {statistics.total}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Network activity records
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10">
              <svg
                className="h-5 w-5 text-blue-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <path d="M5 12.55a11 11 0 0 1 14 0" />
                <path d="M8.5 16a6 6 0 0 1 7 0" />
                <path d="M12 19.5h.01" />
              </svg>
            </div>
          </div>

          <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
            <div className="h-full w-full rounded-full bg-blue-500" />
          </div>
        </div>

        {/* Online */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Online Devices
              </p>

              <p className="mt-3 text-3xl font-bold tracking-tight text-green-600 dark:text-green-400">
                {statistics.online}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {statistics.onlinePercentage}% connected
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 dark:bg-green-500/10">
              <span className="h-3 w-3 rounded-full bg-green-500 shadow-[0_0_0_6px_rgba(34,197,94,0.10)]" />
            </div>
          </div>

          <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-green-500"
              style={{
                width: `${statistics.onlinePercentage}%`,
              }}
            />
          </div>
        </div>

        {/* Offline */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Offline Devices
              </p>

              <p className="mt-3 text-3xl font-bold tracking-tight text-red-600 dark:text-red-400">
                {statistics.offline}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {statistics.offlinePercentage}% disconnected
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10">
              <span className="h-3 w-3 rounded-full bg-red-500" />
            </div>
          </div>

          <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-red-500"
              style={{
                width: `${statistics.offlinePercentage}%`,
              }}
            />
          </div>
        </div>

        {/* Battery */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Avg. Battery
              </p>

              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {statistics.averageBattery}%
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Available device data
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10">
              <svg
                className="h-5 w-5 text-amber-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <rect
                  x="3"
                  y="7"
                  width="17"
                  height="10"
                  rx="2"
                />
                <path d="M21 10v4" />
                <path d="M7 10v4" />
              </svg>
            </div>
          </div>

          <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-amber-500"
              style={{
                width: `${statistics.averageBattery}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ======================================================
          MONITORING OVERVIEW
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Connection Health */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Connection Health
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Current connectivity overview
              </p>
            </div>

            <Badge
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                statistics.onlinePercentage >= 80
                  ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400"
                  : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
              }`}
            >
              {statistics.onlinePercentage >= 80
                ? "Healthy"
                : "Monitor"}
            </Badge>
          </div>

          <div className="mt-5 flex items-center gap-5">
            <div
              className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(
                  rgb(34 197 94) ${statistics.onlinePercentage}%,
                  rgb(226 232 240) ${statistics.onlinePercentage}% 100%
                )`,
              }}
            >
              <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-white dark:bg-white/[0.04]">
                <span className="text-xl font-bold text-slate-900 dark:text-white">
                  {statistics.onlinePercentage}%
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-slate-500">
                  Online
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {statistics.online}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-slate-500">
                  Offline
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {statistics.offline}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Network Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Network Distribution
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Detected connection types
            </p>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Wi-Fi
                </span>

                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {statistics.wifi}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{
                    width:
                      statistics.total > 0
                        ? `${Math.round(
                            (statistics.wifi /
                              statistics.total) *
                              100
                          )}%`
                        : "0%",
                  }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  Mobile
                </span>

                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {statistics.mobile}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{
                    width:
                      statistics.total > 0
                        ? `${Math.round(
                            (statistics.mobile /
                              statistics.total) *
                              100
                          )}%`
                        : "0%",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Location Coverage */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Location Coverage
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Records containing GPS coordinates
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
              <svg
                className="h-5 w-5 text-indigo-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {statistics.locationPercentage}%
              </span>

              <span className="text-xs text-slate-400">
                {statistics.locationAvailable} records
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{
                  width: `${statistics.locationPercentage}%`,
                }}
              />
            </div>

            <p className="mt-2 text-[11px] text-slate-400">
              GPS data availability
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================
          NETWORK ACTIVITY TABLE
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10">
                <svg
                  className="h-4 w-4 text-blue-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M5 12.55a11 11 0 0 1 14 0" />
                  <path d="M8.5 16a6 6 0 0 1 7 0" />
                  <path d="M12 19.5h.01" />
                </svg>
              </div>

              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Network Activity
              </h2>

              {isFetching && (
                <span className="flex items-center gap-1.5 text-xs text-blue-500">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                  Updating
                </span>
              )}
            </div>

            <p className="mt-1 pl-10 text-xs text-slate-400">
              Detailed device and connectivity records
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
              {data?.total || 0} Records
            </span>
          </div>
        </div>

        {/* Error */}
        {isError && (
          <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-500/20">
                <svg
                  className="h-5 w-5 text-red-600 dark:text-red-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </div>

              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                  Unable to load network logs
                </p>

                <p className="mt-0.5 text-xs text-red-600/80 dark:text-red-400/80">
                  Please refresh the data and try again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* IMPORTANT:
            No overflow-x-auto wrapper here.
            DataTable itself has been updated to use
            overflow-hidden/table-fixed.
        */}
        <div className="w-full">
          <DataTable
            columns={columns}
            data={records}
            loading={isLoading}
          />
        </div>

        {/* Pagination */}
        <div className="border-t border-slate-200 dark:border-white/10">
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
    </div>
  );
}