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
import {
  ManagementDetailTile,
  ManagementHero,
  ManagementIconBadge,
  ManagementInlineState,
  ManagementPanel,
  ManagementPageState,
  ManagementRowsSkeleton,
  ManagementSkeletonBlock,
  ManagementSurfaceCard,
  ToneBadge,
} from "../../components/shared/management-ui";
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

  const { data: summary, isLoading: summaryLoading } = useQuery({
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

  const { data: trips, isLoading: recentTripsLoading } = useQuery({
    queryKey: ["trips", companyId, "recent"],
    queryFn: () =>
      apiClient.get<ApiResponse<Trip[]>>(ENDPOINTS.TRIPS, {
        companyId,
        limit: 5,
        page: 1,
      }),
    enabled: !!companyId,
  });

  const { data: alerts, isLoading: recentAlertsLoading } = useQuery({
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
    return (
      <ManagementPageState
        title={t("ui_state.loading_title")}
        description={t("ui_state.loading_description")}
      />
    );
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
    <div className="space-y-5 md:space-y-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_370px]">
        <ManagementHero
          eyebrow={t("overview.eyebrow")}
          title={t("overview.hero_title")}
          description={t("overview.hero_summary")}
          className="bg-[linear-gradient(135deg,#0d1721_0%,#0f3f3b_52%,#125e52_100%)]"
        >
          <div className="flex flex-wrap gap-2">
            <ToneBadge
              label={t(`roles.${user.role}` as Parameters<typeof t>[0])}
              toneClassName="border-white/15 bg-white/10 text-white/90"
            />
            <ToneBadge
              label={
                activeDrivers > 0
                  ? t("overview.live_status_active")
                  : t("overview.live_status_idle")
              }
              toneClassName="border-white/15 bg-white/10 text-white/90"
            />
            <ToneBadge
              label={t("overview.secure_status")}
              toneClassName="border-white/15 bg-white/10 text-white/90"
            />
          </div>
        </ManagementHero>

        <ManagementPanel
          eyebrow={t("overview.snapshot_eyebrow")}
          title={t("overview.snapshot_title")}
          className="bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(255,255,255,0.72)_100%)]"
          headerSlot={
            <ManagementIconBadge icon={Activity} />
          }
        >
          {summaryLoading ? (
            <div className="mt-5 space-y-4">
              <div className="grid gap-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <ManagementSkeletonBlock
                    key={index}
                    className="h-16 rounded-[22px]"
                  />
                ))}
              </div>
              <ManagementSkeletonBlock className="h-4 w-4/5" />
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-3">
                <ManagementDetailTile
                  label={t("overview.completion_rate")}
                  value={`${completionRate}%`}
                />
                <ManagementDetailTile
                  label={t("overview.active_drivers")}
                  value={String(activeDrivers)}
                />
                <ManagementDetailTile
                  label={t("overview.critical_signals")}
                  value={String(recentAlerts.length)}
                />
              </div>

              <p className="mt-5 text-sm leading-6 text-[var(--color-muted)]">
                {t("overview.snapshot_note")}
              </p>
            </>
          )}
        </ManagementPanel>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryLoading
          ? Array.from({ length: 4 }, (_, index) => (
              <ManagementSurfaceCard
                key={index}
                className="rounded-[26px] bg-[linear-gradient(180deg,var(--color-panel-strong)_0%,rgba(255,255,255,0.72)_100%)] p-5 shadow-[var(--shadow-panel)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <ManagementSkeletonBlock className="h-3 w-24" />
                    <ManagementSkeletonBlock className="h-10 w-16" />
                  </div>
                  <ManagementSkeletonBlock className="h-12 w-12 rounded-2xl" />
                </div>
                <ManagementSkeletonBlock className="mt-4 h-4 w-4/5" />
              </ManagementSurfaceCard>
            ))
          : cards.map((card) => {
          const Icon = card.icon;

          return (
            <ManagementSurfaceCard
              key={card.label}
              className="rounded-[26px] bg-[linear-gradient(180deg,var(--color-panel-strong)_0%,rgba(255,255,255,0.72)_100%)] p-5 shadow-[var(--shadow-panel)]"
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
            </ManagementSurfaceCard>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ManagementPanel
          eyebrow={t("overview.recent_trips_eyebrow")}
          title={t("overview.recent_trips")}
          description={t("overview.recent_trips_description")}
          className="bg-[var(--color-panel-strong)]"
          headerSlot={
            <ManagementIconBadge icon={CalendarClock} />
          }
        >
          <div className="mt-5 space-y-3">
            {recentTripsLoading ? (
              <ManagementRowsSkeleton count={3} />
            ) : recentTrips.length === 0 ? (
              <ManagementInlineState
                title={t("overview.empty_trips")}
                description={t("overview.empty_trips_note")}
              />
            ) : (
              recentTrips.map((trip) => (
                <ManagementSurfaceCard
                  key={trip.id}
                  className="flex items-start justify-between gap-4 rounded-2xl bg-white/70 px-4 py-4"
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
                  <ToneBadge
                    label={t(
                      `status_values.${trip.status}` as Parameters<typeof t>[0],
                    )}
                    toneClassName={cn("shrink-0", statusTone(trip.status))}
                  />
                </ManagementSurfaceCard>
              ))
            )}
          </div>
        </ManagementPanel>

        <ManagementPanel
          eyebrow={t("overview.recent_alerts_eyebrow")}
          title={t("overview.recent_alerts")}
          description={t("overview.recent_alerts_description")}
          className="bg-[var(--color-panel-strong)]"
          headerSlot={
            <ManagementIconBadge
              icon={ShieldAlert}
              className="bg-[rgba(201,95,58,0.10)] text-[var(--color-accent)]"
            />
          }
        >
          <div className="mt-5 space-y-3">
            {recentAlertsLoading ? (
              <ManagementRowsSkeleton count={3} />
            ) : recentAlerts.length === 0 ? (
              <ManagementInlineState
                title={t("overview.empty_alerts")}
                description={t("overview.empty_alerts_note")}
              />
            ) : (
              recentAlerts.map((alert) => (
                <ManagementSurfaceCard
                  key={alert.id}
                  className="flex items-start justify-between gap-4 rounded-2xl bg-white/70 px-4 py-4"
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
                  <ToneBadge
                    label={t(
                      `severity.${alert.severity}` as Parameters<typeof t>[0],
                    )}
                    toneClassName={cn("shrink-0", severityTone(alert.severity))}
                  />
                </ManagementSurfaceCard>
              ))
            )}
          </div>
        </ManagementPanel>
      </section>
    </div>
  );
}
