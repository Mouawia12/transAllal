"use client";

import {
  AlertTriangle,
  BarChart3,
  Building2,
  ChevronsRight,
  LayoutDashboard,
  MapPin,
  Route,
  Settings,
  Truck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore } from "../../lib/auth/auth-store";
import type { Role } from "../../types/shared";
import { cn } from "../../lib/utils/cn";
import { BrandLogo } from "../shared/brand-logo";

type NavItem = {
  key: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
};

const navItems: NavItem[] = [
  {
    key: "overview",
    href: "/",
    icon: LayoutDashboard,
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "DISPATCHER"],
  },
  {
    key: "companies",
    href: "/companies",
    icon: Building2,
    roles: ["SUPER_ADMIN"],
  },
  {
    key: "drivers",
    href: "/drivers",
    icon: Users,
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "DISPATCHER"],
  },
  {
    key: "trucks",
    href: "/trucks",
    icon: Truck,
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "DISPATCHER"],
  },
  {
    key: "trips",
    href: "/trips",
    icon: Route,
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "DISPATCHER"],
  },
  {
    key: "tracking",
    href: "/tracking",
    icon: MapPin,
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "DISPATCHER"],
  },
  {
    key: "alerts",
    href: "/alerts",
    icon: AlertTriangle,
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "DISPATCHER"],
  },
  {
    key: "reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "DISPATCHER"],
  },
  {
    key: "settings",
    href: "/settings",
    icon: Settings,
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "DISPATCHER"],
  },
];

export function Sidebar({
  onHide,
  onNavigate,
  mobile = false,
}: {
  onHide: () => void;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const t = useTranslations();
  const tNav = useTranslations("nav");
  const user = useAuthStore((state) => state.user);
  const role = user?.role;

  const visibleItems = navItems.filter((item) =>
    role ? item.roles.includes(role) : false,
  );

  return (
    <aside
      id="dashboard-sidebar"
      className={cn(
        "relative flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#101d21_0%,#10312f_55%,#0d2626_100%)] text-white shadow-[var(--shadow-elevated)]",
        mobile
          ? "h-full rounded-[30px]"
          : "lg:sticky lg:top-0 lg:h-full lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:rounded-[30px]",
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_38%)]" />

      <div className="relative flex h-full flex-col p-3 lg:p-3.5">
        <div className="rounded-[22px] border border-white/10 bg-white/8 p-3 lg:rounded-[24px] lg:p-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
              {t("dashboard_shell.sidebar_eyebrow")}
            </p>
            <button
              type="button"
              onClick={onHide}
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/70 transition hover:bg-white/10 hover:text-white motion-reduce:transition-none"
              aria-label={t("dashboard_shell.hide_sidebar")}
              title={t("dashboard_shell.hide_sidebar")}
            >
              {mobile ? <X size={16} /> : <ChevronsRight size={16} />}
            </button>
          </div>
          <div className="mt-2 flex items-start gap-3 lg:mt-2.5">
            <BrandLogo
              size={68}
              priority
              className="rounded-[24px] border-white/15 bg-white/10 shadow-[0_22px_44px_rgba(0,0,0,0.26)]"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-[1.45rem] font-semibold tracking-tight text-white lg:text-[1.65rem]">
                Trans Allal
              </h2>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-white/65">
                {t("dashboard_shell.sidebar_summary")}
              </p>
            </div>
          </div>
          {role ? (
            <div className="mt-2.5 inline-flex rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-100 lg:mt-3">
              {t(`roles.${role}` as Parameters<typeof t>[0])}
            </div>
          ) : null}
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto lg:mt-4">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">
            {t("dashboard_shell.navigation")}
          </p>
          <nav className="mt-2.5 space-y-1.5 pb-1">
            {visibleItems.map(({ key, href, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={key}
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:bg-white/12 motion-reduce:transition-none",
                    active
                      ? "border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,rgba(12,107,88,0.24)_100%)] text-white shadow-[0_16px_30px_rgba(0,0,0,0.18)]"
                      : "border border-transparent text-white/72 hover:bg-white/8 hover:text-white",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-2 top-2 start-1 w-1 rounded-full bg-emerald-300"
                    />
                  ) : null}
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition-colors",
                      active
                        ? "border-emerald-300/25 bg-white/12 text-emerald-100"
                        : "border-white/10 bg-white/6 text-white/70 group-hover:border-white/20 group-hover:text-white",
                    )}
                  >
                    <Icon size={17} />
                  </span>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <span className="truncate">
                      {tNav(key as Parameters<typeof tNav>[0])}
                    </span>
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full transition-opacity",
                        active
                          ? "bg-emerald-300 opacity-100"
                          : "bg-white/20 opacity-0 group-hover:opacity-100",
                      )}
                    />
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div
          className={cn(
            "mt-3 rounded-[24px] border border-white/10 bg-black/12 p-3.5",
            mobile ? "block" : "hidden lg:block",
          )}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">
            {t("dashboard_shell.session")}
          </p>
          <div className="mt-2.5 min-w-0">
            <p
              className="truncate text-sm font-semibold text-white"
              title={user ? `${user.firstName} ${user.lastName}` : "—"}
            >
              {user ? `${user.firstName} ${user.lastName}` : "—"}
            </p>
            <p
              className="mt-1 truncate text-xs leading-5 text-white/60"
              title={
                user?.email ??
                (role
                  ? t(`roles.${role}` as Parameters<typeof t>[0])
                  : "")
              }
            >
              {user?.email ??
                (role
                  ? t(`roles.${role}` as Parameters<typeof t>[0])
                  : "")}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
