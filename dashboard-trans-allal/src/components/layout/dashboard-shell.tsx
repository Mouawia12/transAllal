import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden px-2.5 py-2.5 sm:px-3 sm:py-3 md:px-4 md:py-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[rgba(12,107,88,0.12)] blur-3xl" />
        <div className="absolute right-0 top-10 h-80 w-80 rounded-full bg-[rgba(201,95,58,0.12)] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-white/35 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-[1600px] gap-2.5 lg:min-h-[calc(100dvh-1.5rem)] lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-3">
        <Sidebar />
        <div className="flex min-h-0 flex-col overflow-hidden rounded-[26px] border border-[var(--color-border)] bg-[var(--color-panel-muted)] p-2.5 shadow-[var(--shadow-elevated)] backdrop-blur sm:rounded-[28px] sm:p-3 md:rounded-[30px] md:p-4">
          <Topbar />
          <main className="mt-3 min-h-0 flex-1 overflow-y-auto overflow-x-hidden sm:mt-4 sm:pr-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
