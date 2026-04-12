import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1600px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Sidebar />
        <div className="rounded-[32px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.64)] p-4 shadow-[var(--shadow-panel)] backdrop-blur md:p-6">
          <Topbar />
          <main className="mt-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
