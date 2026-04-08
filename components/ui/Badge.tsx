import { clsx } from "clsx";
import type { StayType } from "@/lib/data";

type BadgeVariant = "short" | "long" | "neutral";

function variantFromStayType(stayType: StayType): BadgeVariant {
  return stayType === "SHORT" ? "short" : "long";
}

export default function Badge({
  variant,
  stayType,
  children,
  className,
}: {
  variant?: BadgeVariant;
  stayType?: StayType;
  children: React.ReactNode;
  className?: string;
}) {
  const resolved = variant ?? (stayType ? variantFromStayType(stayType) : "neutral");

  return (
    <span
      className={clsx(
        "inline-block rounded-[5px] px-3 py-1 text-xs font-medium uppercase tracking-wide",
        resolved === "short" && "bg-pink text-white",
        resolved === "long" && "bg-black text-white",
        resolved === "neutral" && "bg-lightgray text-gray",
        className
      )}
    >
      {children}
    </span>
  );
}
