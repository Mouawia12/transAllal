export function RealtimeMapPlaceholder({ enabled }: { enabled?: boolean }) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[linear-gradient(135deg,#0c6b58,#123f4c)] p-6 text-white shadow-[var(--shadow-panel)]">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-white/65">Realtime Surface</p>
          <h2 className="mt-2 text-2xl font-semibold">Map and live tracking slot</h2>
        </div>
        <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs">
          {enabled ? "enabled placeholder" : "available when needed"}
        </div>
      </div>

      <div className="grid min-h-72 place-items-center rounded-[24px] border border-dashed border-white/20 bg-black/10 p-6 text-center text-sm leading-6 text-white/75">
        Future map provider, websocket cursor rendering, trip path visualization, and alert overlays belong here.
      </div>
    </section>
  );
}
