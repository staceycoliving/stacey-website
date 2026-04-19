// Central source for legal content. Matteo can edit here without touching
// page components. Final privacy policy text should be reviewed by a
// lawyer or a certified generator (eRecht24, iubenda) before Go-Live.

export const company = {
  legalName: "Stacey Real Estate GmbH",
  street: "Brooktorkai 7",
  zip: "20457",
  city: "Hamburg",
  country: "Germany",
  phone: "+49 40 696389600",
  email: "booking@stacey.de",
  website: "www.stacey.de",
  managingDirector: "Matteo Kreidler",
  registerCourt: "Local Court of Hamburg (Amtsgericht Hamburg)",
  registerNumber: "HRB 155869",
  vatId: "DE322970397",
};

// ─── IMPRINT ─────────────────────────────────────────────
// Legal disclosure per §5 TMG (German Telemedia Act).
// Identical information to the prior imprint, translated to English.

export type ImprintSection = { heading?: string; paragraphs: string[] };

export const imprint: ImprintSection[] = [
  {
    paragraphs: [
      "We are STACEY",
      company.legalName,
      company.street,
      `${company.zip} ${company.city}, ${company.country}`,
    ],
  },
  {
    paragraphs: [
      company.website,
      `T. ${company.phone}`,
      `E. ${company.email}`,
    ],
  },
  {
    paragraphs: [
      `Managing Director: ${company.managingDirector}`,
      `${company.registerNumber} | ${company.registerCourt}`,
      `VAT ID: ${company.vatId}`,
    ],
  },
  {
    heading: "EU Online Dispute Resolution",
    paragraphs: [
      "The European Commission provides a platform for online dispute resolution (ODR), available at www.ec.europa.eu/consumers/odr.",
      "Stacey Real Estate GmbH is neither willing nor obliged to participate in dispute resolution proceedings before a consumer arbitration board.",
    ],
  },
];

// ─── PRIVACY POLICY ──────────────────────────────────────
// Structural scaffold covering all services we use (as of 2026-04-19).
// The general GDPR paragraphs are marked [PLACEHOLDER] and should be
// replaced with vetted text from a privacy generator or a lawyer review
// before Go-Live. Tool list, purposes and legal bases are accurate.

export type PrivacySection = {
  heading: string;
  paragraphs?: string[];
  items?: {
    name: string;
    purpose: string;
    provider: string;
    legalBasis?: string;
  }[];
};

export const privacy: PrivacySection[] = [
  {
    heading: "1. Data Controller",
    paragraphs: [
      "The controller responsible for data processing under GDPR is:",
      company.legalName,
      `${company.street}, ${company.zip} ${company.city}, ${company.country}`,
      `Email: ${company.email}`,
      `Phone: ${company.phone}`,
    ],
  },
  {
    heading: "2. General Information on Data Processing",
    paragraphs: [
      "[PLACEHOLDER — replace with vetted generator output.] We process personal data of our users only as necessary to provide a functional website and our content and services. Processing of personal data generally takes place only with the user's consent or where the processing is authorised by legal provisions (Art. 6 (1) GDPR).",
    ],
  },
  {
    heading: "3. Services and Tools We Use",
    paragraphs: [
      "To operate our website and booking process, we use the following service providers. The legal basis is, respectively, Art. 6 (1) (b) GDPR (contract performance) or Art. 6 (1) (f) GDPR (legitimate interest).",
    ],
    items: [
      {
        name: "Vercel (Hosting)",
        provider:
          "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA",
        purpose:
          "Website hosting. Processes server logs (IP address, user agent, referrer, timestamp) to ensure operation and security.",
        legalBasis:
          "Art. 6 (1) (f) GDPR (legitimate interest in secure operation)",
      },
      {
        name: "Supabase (Database)",
        provider:
          "Supabase Inc., 970 Toa Payoh North #07-04, Singapore 318992",
        purpose:
          "Storage of booking data, tenant master data, rent payments. Server location: EU (Frankfurt).",
        legalBasis: "Art. 6 (1) (b) GDPR",
      },
      {
        name: "Resend (Transactional Email)",
        provider:
          "Resend, Inc., 2261 Market Street #5039, San Francisco, CA 94114, USA",
        purpose:
          "Sending transactional emails (booking confirmations, contracts, payment information, reminders).",
        legalBasis: "Art. 6 (1) (b) GDPR",
      },
      {
        name: "Stripe (Payments)",
        provider:
          "Stripe Payments Europe, Ltd., 1 Grand Canal Street Lower, Grand Canal Dock, Dublin, Ireland",
        purpose:
          "Processing of booking fee, deposit and monthly rent payments (SEPA direct debit, credit card).",
        legalBasis: "Art. 6 (1) (b) GDPR",
      },
      {
        name: "Yousign (Electronic Signature)",
        provider:
          "Yousign SAS, 350 rue Saint Sauveur, 14000 Caen, France",
        purpose:
          "Legally valid electronic signing of rental contracts (eIDAS-compliant).",
        legalBasis: "Art. 6 (1) (b) GDPR",
      },
      {
        name: "apaleo (Property Management System)",
        provider:
          "apaleo GmbH, Rosental 10, 80331 Munich, Germany",
        purpose:
          "Management of short stays — reservations, check-in/check-out, billing.",
        legalBasis: "Art. 6 (1) (b) GDPR",
      },
      {
        name: "Mapbox (Map Display)",
        provider:
          "Mapbox Inc., 1714 14th Street NW, Washington, DC 20009, USA",
        purpose: "Embedding of interactive maps to display our locations.",
        legalBasis: "Art. 6 (1) (f) GDPR",
      },
      {
        name: "Sentry (Error Monitoring)",
        provider:
          "Functional Software, Inc. dba Sentry, 132 Hawthorne Street, San Francisco, CA 94107, USA",
        purpose:
          "Technical monitoring for error resolution. Captures stack traces and browser metadata; no personal form data is stored.",
        legalBasis: "Art. 6 (1) (f) GDPR",
      },
      {
        name: "Google Fonts (Typography)",
        provider:
          "Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland",
        purpose:
          "Embedding of the 'Montserrat' typeface. Loaded locally via next/font — NO connection to Google servers on page load.",
        legalBasis: "Art. 6 (1) (f) GDPR",
      },
      {
        name: "Cookiebot (Consent Management)",
        provider:
          "Cybot A/S, Havnegade 39, 1058 Copenhagen, Denmark",
        purpose:
          "Display and documentation of cookie consent, automatic blocking of non-essential scripts until consent is granted.",
        legalBasis:
          "Art. 6 (1) (c) GDPR (legal obligation to obtain consent)",
      },
      {
        name: "Google Analytics 4",
        provider:
          "Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland",
        purpose:
          "Measurement of website usage (pages viewed, sessions, rough geography) to improve our product. IP-anonymisation enabled. Data shared with Google LLC (USA) under SCC + EU-US Data Privacy Framework. Loaded ONLY after explicit consent.",
        legalBasis: "Art. 6 (1) (a) GDPR (consent)",
      },
      {
        name: "Google Ads (Conversion Tracking + Remarketing)",
        provider:
          "Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland",
        purpose:
          "Measurement of ad campaign effectiveness (conversions) and re-targeting to users who previously visited our site. Data shared with Google LLC (USA) under SCC + EU-US Data Privacy Framework. Loaded ONLY after explicit consent.",
        legalBasis: "Art. 6 (1) (a) GDPR (consent)",
      },
    ],
  },
  {
    heading: "4. Cookies and Consent",
    paragraphs: [
      "When you first visit our website, a cookie banner (Cookiebot) asks you to choose which categories of cookies to accept: Necessary, Preferences, Statistics and Marketing. Necessary cookies are set by default — they are required for the website to function (session, security, consent storage).",
      "Statistics and Marketing cookies (Google Analytics, Google Ads) are only set AFTER you actively consent. If you decline, no tracking scripts are loaded. You can change or withdraw your consent at any time via the 'Cookie settings' link in the footer.",
      "We implement Google Consent Mode v2: while you have not consented, no personal identifiers are transmitted to Google. Upon consent, tracking begins.",
    ],
  },
  {
    heading: "5. Your Rights",
    paragraphs: [
      `You have the right to access, rectify, erase, restrict, and receive your personal data, as well as to object to processing. You may withdraw any consent you have given at any time. To exercise these rights, please contact us at ${company.email}.`,
      "You also have the right to lodge a complaint with a supervisory authority. For Hamburg: Der Hamburgische Beauftragte für Datenschutz und Informationsfreiheit.",
    ],
  },
  {
    heading: "6. Retention Period",
    paragraphs: [
      "Personal data is deleted as soon as the purpose of processing ceases. For contract-related data, statutory retention periods of up to 10 years apply under German commercial and tax law.",
    ],
  },
  {
    heading: "7. Changes to this Privacy Policy",
    paragraphs: [
      "We reserve the right to update this privacy policy to reflect changes in legal or factual circumstances. Last updated: April 2026.",
    ],
  },
];
