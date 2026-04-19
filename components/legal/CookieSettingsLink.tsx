"use client";

// Opens the Cookiebot consent dialog so users can change their choice.
// If Cookiebot isn't loaded (env var missing or script blocked), the
// link simply does nothing — graceful degradation.

declare global {
  interface Window {
    Cookiebot?: {
      renew: () => void;
      show: () => void;
    };
  }
}

export default function CookieSettingsLink({
  className,
}: {
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.Cookiebot?.renew()}
      className={className}
    >
      Cookie settings
    </button>
  );
}
