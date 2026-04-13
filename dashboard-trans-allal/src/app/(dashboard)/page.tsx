"use client";

import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Route as RouteIcon,
  ShieldAlert,
  Truck,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { apiClient } from "../../lib/api/client";
import { ENDPOINTS } from "../../lib/api/endpoints";
import { useCompanyScope } from "../../lib/company/use-company-scope";
import { CompanyScopeEmpty } from "../../components/shared/company-scope-empty";
import type { Alert, ApiResponse, Trip } from "../../types/shared";
import { cn } from "../../lib/utils/cn";

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusTone(status: string) {
  switch (status) {
    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "IN_PROGRESS":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "CANCELLED":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function severityTone(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return "border-red-200 bg-red-50 text-red-700";
    case "HIGH":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "MEDIUM":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-sky-200 bg-sky-50 text-sky-700";
  }
}

export default function OverviewPage() {
  const t = useTranslations();
  const { user, hasHydrated, companyId } = useCompanyScope();

  const { data: summary } = useQuery({
    queryKey: ["reports", "summary", companyId],
    queryFn: () =>
      apiClient.get<ApiResponse<Record<string, number>>>(
        ENDPOINTS.REPORTS_SUMMARY,
        {
          companyId,
        },
      ),
    enabled: !!companyId,
  });

  const { data: trips } = useQuery({
    queryKey: ["trips", companyId, "recent"],
    queryFn: () =>
      apiClient.get<ApiResponse<Trip[]>>(ENDPOINTS.TRIPS, {
        companyId,
        limit: 5,
        page: 1,
      }),
    enabled: !!companyId,
  });

  const { data: alerts } = useQuery({
    queryKey: ["alerts", companyId, "recent"],
    queryFn: () =>
      apiClient.get<ApiResponse<Alert[]>>(ENDPOINTS.ALERTS, {
        companyId,
        limit: 5,
        page: 1,
      }),
    enabled: !!companyId,
  });

  const s = summary?.data ?? {};

  if (!hasHydrated) {
    return <p className="text-sm text-[var(--color-muted)]">{t("loading")}</p>;
  }

  if (!user || !companyId) {
    return <CompanyScopeEmpty />;
  }

  const totalTrips = s["totalTrips"] ?? 0;
  const completedTrips = s["completedTrips"] ?? 0;
  const activeDrivers = s["activeDrivers"] ?? 0;
  const activeTrucks = s["activeTrucks"] ?? 0;
  const completionRate =
    totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0;
  const recentTrips = trips?.data ?? [];
  const recentAlerts = alerts?.data ?? [];

  const cards = [
    {
      icon: RouteIcon,
      label: t("overview.total_trips"),
      value: totalTrips,
      note: t("overview.total_trips_note"),
      iconTone: "bg-sky-500/12 text-sky-700",
    },
    {
      icon: CheckCircle2,
      label: t("overview.completed_trips"),
      value: completedTrips,
      note: t("overview.completed_trips_note"),
      iconTone: "bg-emerald-500/12 text-emerald-700",
    },
    {
      icon: Users,
      label: t("overview.active_drivers"),
      value: activeDrivers,
      note: t("overview.active_drivers_note"),
      iconTone: "bg-amber-500/12 text-amber-700",
    },
    {
      icon: Truck,
      label: t("overview.active_trucks"),
      value: activeTrucks,
      note: t("overview.active_trucks_note"),
      iconTone: "bg-violet-500/12 text-violet-700",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_370px]">
        <div className="rounded-[30px] border border-[rgba(255,255,255,0.16)] bg-[linear-gradient(135deg,#0d1721_0%,#0f3f3b_52%,#125e52_100%)] p-6 text-white shadow-[var(--shadow-elevated)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">
            {t("overview.eyebrow")}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            {t("overview.hero_title")}
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/78 md:text-base">
            {t("overview.hero_summary")}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90">
              {t(`roles.${user.role}` as Parameters<typeof t>[0])}
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90">
              {activeDrivers > 0
                ? t("overview.live_status_active")
                : t("overview.live_status_idle")}
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90">
              {t("overview.secure_status")}
            </span>
          </div>
        </div>

        <div className="rounded-[30px] border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(255,255,255,0.72)_100%)] p-6 shadow-[var(--shadow-panel)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-brand)]">
                {t("overview.snapshot_eyebrow")}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--color-ink)]">
                {t("overview.snapshot_title")}
              </h3>
            </div>
            <div className="rounded-2xl bg-[rgba(12,107,88,0.08)] p-3 text-[var(--color-brand)]">
              <Activity size={20} />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-[var(--color-border)] bg-white/75 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[var(--color-muted)]">
                  {t("overview.completion_rate")}
                </span>
                <span className="text-xl font-semibold text-[var(--color-ink)]">
                  {completionRate}%
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-white/75 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[var(--color-muted)]">
                  {t("overview.active_drivers")}
                </span>
                <span className="text-xl font-semibold text-[var(--color-ink)]">
                  {activeDrivers}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-white/75 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[var(--color-muted)]">
                  {t("overview.critical_signals")}
                </span>
                <span className="text-xl font-semibold text-[var(--color-ink)]">
                  {recentAlerts.length}
                </span>
              </div>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-[var(--color-muted)]">
            {t("overview.snapshot_note")}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className="rounded-[26px] border border-[var(--color-border)] bg-[linear-gradient(180deg,var(--color-panel-strong)_0%,rgba(255,255,255,0.72)_100%)] p-5 shadow-[var(--shadow-panel)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-brand)]">
                    {card.label}
                  </p>
                  <p className="mt-4 text-4xl font-semibold tracking-tight text-[var(--color-ink)]">
                    {card.value}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                    card.iconTone,
                  )}
                >
                  <Icon size={22} />
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
                {card.note}
              </p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-panel-strong)] p-6 shadow-[var(--shadow-panel)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-brand)]">
                {t("overview.recent_trips_eyebrow")}
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                {t("overview.recent_trips")}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                {t("overview.recent_trips_description")}
              </p>
            </div>
            <div className="rounded-2xl bg-[rgba(12,107,88,0.08)] p-3 text-[var(--color-brand)]">
              <CalendarClock size={20} />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {recentTrips.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 px-5 py-8 text-center">
                <p className="text-sm font-medium text-[var(--color-ink)]">
                  {t("overview.empty_trips")}
                </p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  {t("overview.empty_trips_note")}
                </p>
              </div>
            ) : (
              recentTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-white/70 px-4 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
                      <RouteIcon size={16} className="text-[var(--color-brand)]" />
                      <span className="truncate">
                        {trip.origin}{" "}
                        <span className="text-[var(--color-muted)]">→</span>{" "}
                        {trip.destination}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-[var(--color-muted)]">
                      {formatShortDate(trip.scheduledAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
                      statusTone(trip.status),
                    )}
                  >
                    {t(
                      `status_values.${trip.status}` as Parameters<typeof t>[0],
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-panel-strong)] p-6 shadow-[var(--shadow-panel)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
                {t("overview.recent_alerts_eyebrow")}
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                {t("overview.recent_alerts")}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                {t("overview.recent_alerts_description")}
              </p>
            </div>
            <div className="rounded-2xl bg-[rgba(201,95,58,0.10)] p-3 text-[var(--color-accent)]">
              <ShieldAlert size={20} />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {recentAlerts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 px-5 py-8 text-center">
                <p className="text-sm font-medium text-[var(--color-ink)]">
                  {t("overview.empty_alerts")}
                </p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  {t("overview.empty_alerts_note")}
                </p>
              </div>
            ) : (
              recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-white/70 px-4 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
                      <AlertTriangle
                        size={16}
                        className="text-[var(--color-accent)]"
                      />
                      <span>
                        {t(
                          `alert_types.${alert.type}` as Parameters<typeof t>[0],
                        )}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--color-muted)]">
                      {alert.message || t("overview.alert_without_message")}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
                      severityTone(alert.severity),
                    )}
                  >
                    {t(
                      `severity.${alert.severity}` as Parameters<typeof t>[0],
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
