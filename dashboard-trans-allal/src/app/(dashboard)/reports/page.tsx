"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../lib/api/client";
import { ENDPOINTS } from "../../../lib/api/endpoints";
import { CompanyScopeEmpty } from "../../../components/shared/company-scope-empty";
import { useCompanyScope } from "../../../lib/company/use-company-scope";

type SummaryReport = {
  totalTrips: number;
  completedTrips: number;
  activeTrips: number;
  pendingTrips: number;
  activeDrivers: number;
  activeTrucks: number;
};

type TripsReportRow = {
  period: string;
  total: number;
  completed: number;
  cancelled: number;
};

type DriversReportRow = {
  id: string;
  firstName: string;
  lastName: string;
  totalTrips: number;
  completedTrips: number;
};

type AlertsReportRow = {
  type: string;
  severity: string;
  total: number;
};

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildReportDateRange(from: string, to: string) {
  return {
    from: new Date(`${from}T00:00:00.000Z`).toISOString(),
    to: new Date(`${to}T23:59:59.999Z`).toISOString(),
  };
}

export default function ReportsPage() {
  const t = useTranslations();
  const { user, hasHydrated, companyId } = useCompanyScope();
  const [from, setFrom] = useState(() => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - 29);
    return toDateInputValue(date);
  });
  const [to, setTo] = useState(() => toDateInputValue(new Date()));
  const [groupBy, setGroupBy] = useState<"day" | "week">("day");

  const isValidRange = from <= to;
  const reportRange = buildReportDateRange(from, to);

  const { data: summary } = useQuery({
    queryKey: ["reports", "summary", companyId],
    queryFn: () =>
      apiClient.get<{ data: SummaryReport }>(ENDPOINTS.REPORTS_SUMMARY, {
        companyId,
      }),
    enabled: !!companyId,
  });

  const { data: tripsReport, isLoading: tripsLoading } = useQuery({
    queryKey: ["reports", "trips", companyId, reportRange.from, reportRange.to, groupBy],
    queryFn: () =>
      apiClient.get<{ data: TripsReportRow[] }>(ENDPOINTS.REPORTS_TRIPS, {
        companyId,
        from: reportRange.from,
        to: reportRange.to,
        groupBy,
      }),
    enabled: !!companyId && isValidRange,
  });

  const { data: driversReport, isLoading: driversLoading } = useQuery({
    queryKey: ["reports", "drivers", companyId, reportRange.from, reportRange.to],
    queryFn: () =>
      apiClient.get<{ data: DriversReportRow[] }>(ENDPOINTS.REPORTS_DRIVERS, {
        companyId,
        from: reportRange.from,
        to: reportRange.to,
      }),
    enabled: !!companyId && isValidRange,
  });

  const { data: alertsReport, isLoading: alertsLoading } = useQuery({
    queryKey: ["reports", "alerts", companyId, reportRange.from, reportRange.to],
    queryFn: () =>
      apiClient.get<{ data: AlertsReportRow[] }>(ENDPOINTS.REPORTS_ALERTS, {
        companyId,
        from: reportRange.from,
        to: reportRange.to,
      }),
    enabled: !!companyId && isValidRange,
  });

  const s: Partial<SummaryReport> = summary?.data ?? {};

  if (!hasHydrated) {
    return <p className="text-sm text-gray-400">{t("loading")}</p>;
  }

  if (!user || !companyId) {
    return <CompanyScopeEmpty />;
  }

  const cards = [
    { label: t("overview.total_trips"), value: s["totalTrips"] ?? 0 },
    { label: t("overview.completed_trips"), value: s["completedTrips"] ?? 0 },
    { label: t("reports.active_trips"), value: s["activeTrips"] ?? 0 },
    { label: t("reports.pending_trips"), value: s["pendingTrips"] ?? 0 },
    { label: t("overview.active_drivers"), value: s["activeDrivers"] ?? 0 },
    { label: t("overview.active_trucks"), value: s["activeTrucks"] ?? 0 },
  ];
  const tripRows = tripsReport?.data ?? [];
  const driverRows = driversReport?.data ?? [];
  const alertRows = alertsReport?.data ?? [];
  const tripMax = Math.max(...tripRows.map((row) => row.total), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("nav.reports")}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("reports.description")}
          </p>
        </div>
        <div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 md:grid-cols-4">
          <label className="grid gap-1 text-sm text-gray-600 dark:text-gray-300">
            <span>{t("reports.from")}</span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
          <label className="grid gap-1 text-sm text-gray-600 dark:text-gray-300">
            <span>{t("reports.to")}</span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
          <div className="grid gap-1 text-sm text-gray-600 dark:text-gray-300 md:col-span-2">
            <span>{t("reports.group_by")}</span>
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900">
              {(["day", "week"] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setGroupBy(value)}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                    groupBy === value
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  {value === "day" ? t("reports.day") : t("reports.week")}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!isValidRange && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {t("reports.invalid_range")}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5"
          >
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {c.value}
            </p>
            <p className="text-sm text-gray-400 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
        <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("reports.trips_trend")}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("reports.trips_trend_description")}
              </p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500 dark:bg-gray-900 dark:text-gray-300">
              {groupBy === "day" ? t("reports.day") : t("reports.week")}
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {tripsLoading && (
              <p className="text-sm text-gray-400">{t("loading")}</p>
            )}
            {!tripsLoading && tripRows.length === 0 && (
              <p className="text-sm text-gray-400">{t("reports.no_report_data")}</p>
            )}
            {tripRows.map((row) => {
              const width = `${Math.max((row.total / tripMax) * 100, 6)}%`;

              return (
                <div key={row.period} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-200">
                      {new Date(row.period).toLocaleDateString()}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {row.completed}/{row.total} {t("reports.completed")}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-900">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width }}
                    />
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>{t("reports.total")}: {row.total}</span>
                    <span>{t("reports.completed")}: {row.completed}</span>
                    <span>{t("reports.cancelled")}: {row.cancelled}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("reports.driver_performance")}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("reports.driver_performance_description")}
          </p>
          <div className="mt-5 space-y-3">
            {driversLoading && (
              <p className="text-sm text-gray-400">{t("loading")}</p>
            )}
            {!driversLoading && driverRows.length === 0 && (
              <p className="text-sm text-gray-400">{t("reports.no_report_data")}</p>
            )}
            {driverRows.slice(0, 8).map((driver, index) => (
              <div
                key={driver.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-700"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {index + 1}. {driver.firstName} {driver.lastName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("reports.total")}: {driver.totalTrips}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {driver.completedTrips}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("reports.completed")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("reports.alert_breakdown")}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("reports.alert_breakdown_description")}
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {alertsLoading && (
            <p className="text-sm text-gray-400">{t("loading")}</p>
          )}
          {!alertsLoading && alertRows.length === 0 && (
            <p className="text-sm text-gray-400">{t("reports.no_report_data")}</p>
          )}
          {alertRows.map((alert) => (
            <div
              key={`${alert.type}-${alert.severity}`}
              className="rounded-xl border border-gray-100 p-4 dark:border-gray-700"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {t(`alert_types.${alert.type}` as Parameters<typeof t>[0])}
                </span>
                <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
                  {t(`severity.${alert.severity}` as Parameters<typeof t>[0])}
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-gray-900 dark:text-white">
                {alert.total}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("reports.alerts_total")}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
