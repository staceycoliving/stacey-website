"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import Link from "next/link";

/**
 * Page-level error fallback. Next.js 16 App Router invokes this when a
 * route segment's `error.tsx` file exports it as default. Keeps the
 * admin shell intact — the user sees the navbar + a friendly in-content
 * panel instead of a blank page.
 */
export function ErrorFallback({
  error,
  reset,
  context,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  context?: string;
}) {
  useEffect(() => {
    console.error("[admin error]", context, error);
  }, [error, context]);

  return (
    <div className="bg-white rounded-[5px] border-2 border-red-200 p-6 max-w-2xl mx-auto mt-8">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-black">
            Something went wrong
          </h2>
          <p className="text-sm text-gray mt-1">
            {context
              ? `The ${context} page couldn't render.`
              : "This page couldn't render."}{" "}
            It&apos;s been logged — you can try again or go back to the dashboard.
          </p>
          {error.message && (
            <pre className="mt-3 p-2 bg-background-alt rounded-[5px] text-xs overflow-x-auto text-red-700 whitespace-pre-wrap">
              {error.message}
            </pre>
          )}
          {error.digest && (
            <p className="text-[10px] text-gray mt-2 font-mono">
              digest: {error.digest}
            </p>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={reset}
              className="inline-flex items-center gap-1 px-3 py-2 bg-black text-white rounded-[5px] text-sm hover:bg-black/90"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Try again
            </button>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 px-3 py-2 border border-lightgray rounded-[5px] text-sm hover:bg-background-alt"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
