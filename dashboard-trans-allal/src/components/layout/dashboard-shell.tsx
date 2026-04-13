import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-4 md:px-5 md:py-5">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[rgba(12,107,88,0.12)] blur-3xl" />
        <div className="absolute right-0 top-10 h-80 w-80 rounded-full bg-[rgba(201,95,58,0.12)] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-white/35 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100dvh-2rem)] max-w-[1600px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Sidebar />
        <div className="flex min-h-0 flex-col overflow-hidden rounded-[32px] border border-[var(--color-border)] bg-[var(--color-panel-muted)] p-4 shadow-[var(--shadow-elevated)] backdrop-blur md:p-5">
          <Topbar />
          <main className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
