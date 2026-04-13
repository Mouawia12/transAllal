"use client";

import {
  AlertTriangle,
  BarChart3,
  Building2,
  LayoutDashboard,
  MapPin,
  Route,
  Settings,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore } from "../../lib/auth/auth-store";
import type { Role } from "../../types/shared";
import { cn } from "../../lib/utils/cn";

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
    roles: ["COMPANY_ADMIN", "DISPATCHER"],
  },
  {
    key: "trucks",
    href: "/trucks",
    icon: Truck,
    roles: ["COMPANY_ADMIN", "DISPATCHER"],
  },
  {
    key: "trips",
    href: "/trips",
    icon: Route,
    roles: ["COMPANY_ADMIN", "DISPATCHER"],
  },
  {
    key: "tracking",
    href: "/tracking",
    icon: MapPin,
    roles: ["COMPANY_ADMIN", "DISPATCHER"],
  },
  {
    key: "alerts",
    href: "/alerts",
    icon: AlertTriangle,
    roles: ["COMPANY_ADMIN", "DISPATCHER"],
  },
  {
    key: "reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["COMPANY_ADMIN", "DISPATCHER"],
  },
  {
    key: "settings",
    href: "/settings",
    icon: Settings,
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "DISPATCHER"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations();
  const tNav = useTranslations("nav");
  const user = useAuthStore((state) => state.user);
  const role = user?.role;

  const visibleItems = navItems.filter((item) =>
    role ? item.roles.includes(role) : false,
  );

  return (
    <aside className="relative flex min-h-0 flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,#101d21_0%,#10312f_55%,#0d2626_100%)] text-white shadow-[var(--shadow-elevated)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_38%)]" />

      <div className="relative flex h-full flex-col p-4">
        <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
            {t("dashboard_shell.sidebar_eyebrow")}
          </p>
          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Trans Allal
              </h2>
              <p className="mt-1 text-sm leading-6 text-white/65">
                {t("dashboard_shell.sidebar_summary")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
          </div>
          {role ? (
            <div className="mt-4 inline-flex rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-100">
              {t(`roles.${role}` as Parameters<typeof t>[0])}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex-1 overflow-y-auto">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">
            {t("dashboard_shell.navigation")}
          </p>
          <nav className="mt-3 space-y-1.5">
            {visibleItems.map(({ key, href, icon: Icon }) => {
              const active =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={key}
                  href={href}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-white text-[color:var(--color-brand-deep)] shadow-[0_16px_30px_rgba(0,0,0,0.18)]"
                      : "text-white/72 hover:bg-white/8 hover:text-white",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-colors",
                      active
                        ? "border-[rgba(12,107,88,0.12)] bg-[rgba(12,107,88,0.08)] text-[var(--color-brand)]"
                        : "border-white/10 bg-white/6 text-white/70 group-hover:border-white/20 group-hover:text-white",
                    )}
                  >
                    <Icon size={18} />
                  </span>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <span className="truncate">
                      {tNav(key as Parameters<typeof tNav>[0])}
                    </span>
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full transition-opacity",
                        active
                          ? "bg-[var(--color-brand)] opacity-100"
                          : "bg-white/20 opacity-0 group-hover:opacity-100",
                      )}
                    />
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-4 rounded-[24px] border border-white/10 bg-black/12 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">
            {t("dashboard_shell.session")}
          </p>
          <div className="mt-3">
            <p className="text-sm font-semibold text-white">
              {user ? `${user.firstName} ${user.lastName}` : "—"}
            </p>
            <p className="mt-1 text-xs leading-5 text-white/60">
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
