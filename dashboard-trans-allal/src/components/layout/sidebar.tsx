import Link from "next/link";
import { dashboardNavigation } from "@/lib/constants/navigation";

export function Sidebar() {
  return (
    <aside className="rounded-[32px] border border-[var(--color-border)] bg-[rgba(11,42,36,0.94)] p-6 text-white shadow-[var(--shadow-panel)]">
      <div className="mb-8 space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-white/55">
          dashboard-trans-allal
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">
          Trans Allal Operations Workspace
        </h2>
        <p className="text-sm leading-6 text-white/70">
          Structured for backend integration, auth expansion, analytics, and realtime fleet visibility.
        </p>
      </div>

      <nav className="space-y-2">
        {dashboardNavigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
          >
            <p className="text-sm font-medium">{item.label}</p>
            <p className="mt-1 text-xs leading-5 text-white/60">{item.description}</p>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
