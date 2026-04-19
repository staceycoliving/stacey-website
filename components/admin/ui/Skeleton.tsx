/**
 * Skeleton loading placeholders. Use instead of "Loading…" text where
 * shape of the final content is known (table rows, cards, KPI grids).
 *
 * <Skeleton className="h-4 w-40" />          // single line
 * <SkeletonText lines={3} />                  // multi-line text block
 * <SkeletonRow cells={5} />                   // table row
 * <SkeletonCard />                            // generic card placeholder
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-background-alt rounded-[5px] ${className}`}
      aria-hidden
    />
  );
}

export function SkeletonText({
  lines = 3,
  widths,
}: {
  lines?: number;
  widths?: string[];
}) {
  const defaultWidths = ["w-full", "w-5/6", "w-4/6", "w-3/6"];
  return (
    <div className="space-y-2" role="status" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${widths?.[i] ?? defaultWidths[i % defaultWidths.length]}`}
        />
      ))}
    </div>
  );
}

export function SkeletonRow({ cells = 4 }: { cells?: number }) {
  return (
    <tr className="border-t border-lightgray/50" role="status" aria-label="Loading row">
      {Array.from({ length: cells }).map((_, i) => (
        <td key={i} className="px-3 py-2">
          <Skeleton className="h-3 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard({
  className = "",
  lines = 3,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div
      className={`bg-white rounded-[5px] border border-lightgray p-4 space-y-2 ${className}`}
      role="status"
      aria-label="Loading"
    >
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-6 w-1/2" />
      {lines > 1 && <Skeleton className="h-3 w-2/3" />}
    </div>
  );
}

/** KPI-grid skeleton — 4 boxes with title + value + subtitle. */
export function SkeletonKpiGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** Full-table skeleton: header + N rows. */
export function SkeletonTable({
  rows = 5,
  cells = 5,
}: {
  rows?: number;
  cells?: number;
}) {
  return (
    <div className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-background-alt border-b border-lightgray">
            {Array.from({ length: cells }).map((_, i) => (
              <th key={i} className="px-3 py-2 text-left">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} cells={cells} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
