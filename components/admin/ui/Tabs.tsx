"use client";

/**
 * Shared tab bar for admin pages. Supports optional badge count per tab
 * (for attention-needed indicators) and optional sticky behavior.
 *
 * <Tabs
 *   items={[
 *     { id: "profile", label: "Profile" },
 *     { id: "payments", label: "Payments", badge: 3 },
 *   ]}
 *   activeId={tab}
 *   onChange={setTab}
 *   sticky
 * />
 */
export type TabItem = {
  id: string;
  label: string;
  badge?: number;
};

export function Tabs({
  items,
  activeId,
  onChange,
  sticky = false,
  className = "",
}: {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  sticky?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`border-b border-lightgray flex overflow-x-auto bg-white ${
        sticky
          ? "sticky top-14 z-20 rounded-t-[5px] shadow-[0_1px_0_rgba(0,0,0,0.04)] print:static"
          : ""
      } ${className}`}
      role="tablist"
    >
      {items.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={activeId === t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors inline-flex items-center gap-1.5 ${
            activeId === t.id
              ? "border-black text-black"
              : "border-transparent text-gray hover:text-black"
          }`}
        >
          {t.label}
          {t.badge !== undefined && t.badge > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
