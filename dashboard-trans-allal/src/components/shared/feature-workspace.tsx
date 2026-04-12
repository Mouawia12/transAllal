import { RealtimeMapPlaceholder } from "@/components/maps/realtime-map-placeholder";
import { DataTablePlaceholder } from "@/components/tables/data-table-placeholder";
import { SectionCard } from "@/components/ui/section-card";
import type { FeatureDescriptor } from "@/types/dashboard";
import { PageIntro } from "./page-intro";

export function FeatureWorkspace({ feature }: { feature: FeatureDescriptor }) {
  return (
    <div className="space-y-6">
      <PageIntro title={feature.title} summary={feature.summary} />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          eyebrow="Readiness Scope"
          title={`${feature.title} implementation boundary`}
          description="This page is intentionally skeletal and documents where Claude Code should continue the implementation work."
        >
          <ul className="space-y-3 text-sm text-[var(--color-muted)]">
            {feature.readiness.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          eyebrow="API Contract"
          title="Planned backend touchpoints"
          description="Centralized endpoints are already prepared in the API layer. These are the most likely first integration points for this feature."
        >
          <ul className="space-y-3 text-sm text-[var(--color-muted)]">
            {feature.apiPaths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <RealtimeMapPlaceholder enabled={feature.realtime} />
        <DataTablePlaceholder
          title={`${feature.title} placeholder grid`}
          columns={["Column", "Purpose", "Status"]}
          rows={[
            ["Primary view", "Prepared route and folder", "Ready"],
            ["API integration", "Central client and config in place", "Ready"],
            ["Business logic", "Deferred to next phase", "Pending"],
          ]}
        />
      </div>
    </div>
  );
}
