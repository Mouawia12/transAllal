type DataTablePlaceholderProps = {
  title: string;
  columns: string[];
  rows: string[][];
};

export function DataTablePlaceholder({
  title,
  columns,
  rows,
}: DataTablePlaceholderProps) {
  return (
    <section className="rounded-[28px] border border-[var(--color-border)] bg-white/78 p-6 shadow-[var(--shadow-panel)]">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-brand)]">
          Data Surface
        </p>
        <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-[var(--color-border)]">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-[rgba(12,107,88,0.08)] text-[var(--color-muted)]">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${title}-${rowIndex}`} className="border-t border-[var(--color-border)]">
                {row.map((cell) => (
                  <td key={cell} className="px-4 py-3 text-[var(--color-muted)]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
