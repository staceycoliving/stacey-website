/**
 * Shared admin UI primitives. Import everything from here, not the
 * individual files, so we can re-organise internally later.
 *
 *   import { useToast, Breadcrumbs, EmptyState, Modal, Tabs } from "@/components/admin/ui";
 */

export { ToastProvider, useToast, toast } from "./Toast";
export { Breadcrumbs, type Crumb } from "./Breadcrumbs";
export { EmptyState } from "./EmptyState";
export {
  Skeleton,
  SkeletonText,
  SkeletonRow,
  SkeletonCard,
  SkeletonKpiGrid,
  SkeletonTable,
} from "./Skeleton";
export { Modal } from "./Modal";
export { Tabs, type TabItem } from "./Tabs";
export { ErrorFallback } from "./ErrorFallback";
