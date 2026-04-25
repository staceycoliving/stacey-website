import { type ReactNode } from "react";

/**
 * Consistent empty-state for lists / tables / sections that have no data.
 * Use inside a container, this adds its own padding but no outer border.
 *
 * <EmptyState
 *   icon={<Mail className="w-6 h-6" />}
 *   title="No emails yet"
 *   description="When the system sends an email it'll show up here."
 *   action={<Link href="/admin/emails">Open email hub</Link>}
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  size = "md",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const sizeCls =
    size === "sm"
      ? "py-6 px-4"
      : size === "lg"
        ? "py-16 px-6"
        : "py-10 px-6";
  const iconCls =
    size === "sm" ? "w-8 h-8" : size === "lg" ? "w-14 h-14" : "w-10 h-10";
  return (
    <div
      className={`text-center ${sizeCls} text-gray`}
      role="status"
      aria-live="polite"
    >
      {icon && (
        <div
          className={`${iconCls} mx-auto rounded-full bg-background-alt flex items-center justify-center text-gray mb-3`}
        >
          {icon}
        </div>
      )}
      <div className="text-sm font-medium text-black">{title}</div>
      {description && (
        <div className="text-xs mt-1 max-w-sm mx-auto">{description}</div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
