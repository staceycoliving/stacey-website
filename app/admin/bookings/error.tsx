"use client";
import { ErrorFallback } from "@/components/admin/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} context="bookings" />;
}
