import Script from "next/script";
import { env } from "@/lib/env";

// Cookiebot + Google Consent Mode v2 + GA4 + Google Ads.
//
// Load order is load-bearing:
//   1. gtag() + consent defaults (all "denied")  → beforeInteractive
//   2. Cookiebot CMP (auto-blocks everything else) → beforeInteractive
//   3. GA4 / Google Ads gtag.js                    → afterInteractive
//
// Cookiebot's auto-blocking mode scans the page, sees the GA script, and
// rewrites its type to text/plain until the user consents. On consent
// update, Cookiebot fires gtag('consent','update',...) automatically.
//
// Safeguard: GA4 and Google Ads ONLY load if Cookiebot CBID is also set.
// Prevents accidentally shipping tracking without a CMP in place.

export default function ConsentScripts() {
  const cbid = env.NEXT_PUBLIC_COOKIEBOT_CBID;
  const ga4 = env.NEXT_PUBLIC_GA4_ID;
  const adsId = env.NEXT_PUBLIC_GOOGLE_ADS_ID;

  if (!cbid) return null; // no CMP → no tracking scripts either

  const trackingEnabled = Boolean(ga4 || adsId);

  return (
    <>
      {/* 1. Consent Mode v2 defaults, must run BEFORE gtag.js loads. */}
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document -- App Router: beforeInteractive must live in root layout per Next.js docs */}
      <Script
        id="consent-default"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              'ad_storage': 'denied',
              'ad_user_data': 'denied',
              'ad_personalization': 'denied',
              'analytics_storage': 'denied',
              'functionality_storage': 'denied',
              'personalization_storage': 'denied',
              'security_storage': 'granted',
              'wait_for_update': 500
            });
            gtag('set', 'ads_data_redaction', true);
            gtag('set', 'url_passthrough', true);
          `,
        }}
      />

      {/* 2. Cookiebot CMP, auto-blocks all non-essential scripts. */}
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document -- App Router: beforeInteractive must live in root layout per Next.js docs */}
      <Script
        id="Cookiebot"
        src="https://consent.cookiebot.com/uc.js"
        data-cbid={cbid}
        data-blockingmode="auto"
        strategy="beforeInteractive"
      />

      {/* 3. GA4 / Google Ads, blocked by Cookiebot until consent. */}
      {trackingEnabled && (
        <>
          <Script
            id="gtag-loader"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4 || adsId}`}
          />
          <Script
            id="gtag-config"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                gtag('js', new Date());
                ${ga4 ? `gtag('config', '${ga4}');` : ""}
                ${adsId ? `gtag('config', '${adsId}');` : ""}
              `,
            }}
          />
        </>
      )}
    </>
  );
}
