"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

/**
 * Global toast notifications — replaces browser `alert()` across the
 * admin panel. Auto-dismiss after `duration` ms (default 4s). Rendered
 * at the bottom-right, stacked from newest on top.
 *
 * Usage in any client component:
 *   const toast = useToast();
 *   toast.success("Saved");
 *   toast.error("Nope", { description: "details..." });
 *   toast.warn("Careful");
 *   toast.info("FYI");
 */

type ToastKind = "success" | "error" | "warn" | "info";

type ToastItem = {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  duration: number;
};

type ToastContextValue = {
  push: (kind: ToastKind, title: string, opts?: ToastOpts) => void;
  success: (title: string, opts?: ToastOpts) => void;
  error: (title: string, opts?: ToastOpts) => void;
  warn: (title: string, opts?: ToastOpts) => void;
  info: (title: string, opts?: ToastOpts) => void;
};

type ToastOpts = { description?: string; duration?: number };

const ToastContext = createContext<ToastContextValue | null>(null);

// Module-level ref set by the active <ToastProvider>. Lets us export a
// simple `toast` object that any code can import without needing the
// useToast() hook (and thus without needing a component context).
// Falls back to window.alert() when no provider is mounted — useful for
// unit tests and rendering outside the admin shell.
let activeToast: ToastContextValue | null = null;

function alertFallback(prefix: string, title: string, opts?: ToastOpts) {
  if (typeof window === "undefined") {
    console.warn(`[toast]`, prefix, title, opts);
    return;
  }
  window.alert(
    `${prefix}${title}${opts?.description ? `\n\n${opts.description}` : ""}`
  );
}

/** Singleton toast API — import and call from anywhere:
 *    import { toast } from "@/components/admin/ui";
 *    toast.success("Saved");
 *    toast.error("Failed", { description: err });
 */
export const toast = {
  success: (title: string, opts?: ToastOpts) => {
    if (activeToast) activeToast.success(title, opts);
    else alertFallback("✓ ", title, opts);
  },
  error: (title: string, opts?: ToastOpts) => {
    if (activeToast) activeToast.error(title, opts);
    else alertFallback("✗ ", title, opts);
  },
  warn: (title: string, opts?: ToastOpts) => {
    if (activeToast) activeToast.warn(title, opts);
    else alertFallback("⚠ ", title, opts);
  },
  info: (title: string, opts?: ToastOpts) => {
    if (activeToast) activeToast.info(title, opts);
    else alertFallback("", title, opts);
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timeoutsRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (kind: ToastKind, title: string, opts: ToastOpts = {}) => {
      const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = opts.duration ?? (kind === "error" ? 6000 : 4000);
      const item: ToastItem = {
        id,
        kind,
        title,
        description: opts.description,
        duration,
      };
      setToasts((prev) => [item, ...prev].slice(0, 6));
      const handle = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timeoutsRef.current.delete(id);
      }, duration);
      timeoutsRef.current.set(id, handle);
    },
    []
  );

  const value: ToastContextValue = useMemo(
    () => ({
      push,
      success: (title, opts) => push("success", title, opts),
      error: (title, opts) => push("error", title, opts),
      warn: (title, opts) => push("warn", title, opts),
      info: (title, opts) => push("info", title, opts),
    }),
    [push]
  );

  // Register this provider as the active one so the module-level `toast`
  // singleton can route calls through. Clean up on unmount so stale
  // references don't leak.
  useEffect(() => {
    activeToast = value;
    return () => {
      if (activeToast === value) activeToast = null;
    };
  }, [value]);

  // Clear timeouts on unmount
  useEffect(() => {
    const handles = timeoutsRef.current;
    return () => {
      handles.forEach((h) => clearTimeout(h));
    };
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback to console + alert if no provider — keeps old code
    // running during the migration phase.
    return {
      push: (kind, title, opts) => {
        console.warn(`[toast:${kind}]`, title, opts);
        if (typeof window !== "undefined") window.alert(title);
      },
      success: (title) => {
        if (typeof window !== "undefined") window.alert(`✓ ${title}`);
      },
      error: (title, opts) => {
        if (typeof window !== "undefined")
          window.alert(`✗ ${title}${opts?.description ? `\n\n${opts.description}` : ""}`);
      },
      warn: (title) => {
        if (typeof window !== "undefined") window.alert(`⚠ ${title}`);
      },
      info: (title) => {
        if (typeof window !== "undefined") window.alert(title);
      },
    };
  }
  return ctx;
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const { kind, title, description } = item;
  const icon =
    kind === "success" ? (
      <CheckCircle2 className="w-4 h-4 text-green-600" />
    ) : kind === "error" ? (
      <XCircle className="w-4 h-4 text-red-600" />
    ) : kind === "warn" ? (
      <AlertTriangle className="w-4 h-4 text-orange-600" />
    ) : (
      <Info className="w-4 h-4 text-blue-600" />
    );
  const tone =
    kind === "success"
      ? "border-green-200 bg-white"
      : kind === "error"
        ? "border-red-200 bg-white"
        : kind === "warn"
          ? "border-orange-200 bg-white"
          : "border-blue-200 bg-white";
  return (
    <div
      role="status"
      className={`pointer-events-auto min-w-[260px] max-w-sm rounded-[5px] border shadow-lg px-3 py-2.5 animate-in slide-in-from-right-4 fade-in ${tone}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-black">{title}</div>
          {description && (
            <div className="text-xs text-gray mt-0.5 whitespace-pre-wrap">
              {description}
            </div>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-gray/60 hover:text-black"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
