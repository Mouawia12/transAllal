import { MetricCard } from "@/components/charts/metric-card";
import { RealtimeMapPlaceholder } from "@/components/maps/realtime-map-placeholder";
import { PageIntro } from "@/components/shared/page-intro";
import { DataTablePlaceholder } from "@/components/tables/data-table-placeholder";
import { SectionCard } from "@/components/ui/section-card";

export function OverviewPage() {
  return (
    <div className="space-y-6">
      <PageIntro
        title="Operations overview scaffold"
        summary="This dashboard home is organized as the future landing surface for fleet status, trip activity, incident alerts, and live tracking. The structure is ready for backend integration but intentionally leaves business logic for the next phase."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Companies"
          value="00"
          note="Module and route structure are ready for onboarding, status, and operational summaries."
        />
        <MetricCard
          label="Trips"
          value="00"
          note="Prepared to consume future trip lifecycle endpoints and dashboard widgets."
        />
        <MetricCard
          label="Realtime"
          value="WS"
          note="Future websocket client slot already exists in the shared lib layer."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <RealtimeMapPlaceholder enabled />
        <SectionCard
          eyebrow="Implementation Notes"
          title="What Claude Code should do next"
          description="Use the current structure as the execution boundary and start implementing one feature area at a time."
        >
          <ul className="space-y-3 text-sm text-[var(--color-muted)]">
            <li>Wire auth to the backend token endpoints.</li>
            <li>Connect overview cards to real reporting and monitoring endpoints.</li>
            <li>Add charts, filters, tables, and realtime streams feature by feature.</li>
          </ul>
        </SectionCard>
      </div>

      <DataTablePlaceholder
        title="Overview backlog"
        columns={["Area", "Current state", "Next action"]}
        rows={[
          ["API layer", "Ready", "Bind real backend routes"],
          ["Auth layer", "Ready", "Implement session and guards"],
          ["Realtime", "Ready", "Attach websocket subscription flow"],
        ]}
      />
    </div>
  );
}
