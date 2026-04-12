import { dashboardRuntimeConfig } from "@/lib/api/config";

export function Topbar() {
  return (
    <header className="flex flex-col gap-3 rounded-[24px] border border-[var(--color-border)] bg-white/70 p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-brand)]">
          API Ready
        </p>
        <h1 className="text-lg font-semibold">Dashboard scaffold for API-first implementation</h1>
      </div>

      <div className="grid gap-2 text-xs text-[var(--color-muted)] md:text-right">
        <span>Backend: {dashboardRuntimeConfig.apiBaseUrl}</span>
        <span>Realtime: {dashboardRuntimeConfig.wsUrl}</span>
      </div>
    </header>
  );
}
