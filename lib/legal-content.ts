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
      "[PLACEHOLDER, replace with vetted generator output.] We process personal data of our users only as necessary to provide a functional website and our content and services. Processing of personal data generally takes place only with the user's consent or where the processing is authorised by legal provisions (Art. 6 (1) GDPR).",
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
          "Management of short stays, reservations, check-in/check-out, billing.",
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
          "Embedding of the 'Montserrat' typeface. Loaded locally via next/font, NO connection to Google servers on page load.",
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
      "When you first visit our website, a cookie banner (Cookiebot) asks you to choose which categories of cookies to accept: Necessary, Preferences, Statistics and Marketing. Necessary cookies are set by default, they are required for the website to function (session, security, consent storage).",
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

// ─── TERMS OF SERVICE (SHORT STAY) ────────────────────────
// Applies to SHORT-stay bookings (accommodation contracts).
// Long-stay rentals are governed by the separately-signed lease.
// Text taken verbatim from the previous stacey.de /terms-of-service.

export type TermsSection = {
  heading: string;
  paragraphs: string[]; // each string = one numbered paragraph
};

export const termsOfService: TermsSection[] = [
  {
    heading: "§1 Scope of Application",
    paragraphs: [
      `These terms and conditions govern contracts for the rental of space for accommodation purposes ("Suites"), as well as all other services and supplies to the guest by ${company.legalName}, ${company.street}, ${company.zip} ${company.city} ("STACEY").`,
      "These terms and conditions shall apply exclusively. The guest's terms and conditions shall not apply, irrespective of their respective content, unless explicitly acknowledged by STACEY beforehand in text form.",
      "The Suite is rented only for the use during the agreed accommodation period. Suites have to be booked for leisure travel or business travel purposes, but explicitly not for residential purposes.",
    ],
  },
  {
    heading: "§2 Conclusion of Contract, Partner, Statute of Limitations",
    paragraphs: [
      "The accommodation contract shall be concluded with the signing of this document through the guest.",
      "Contractual parties are STACEY and the guest. If a third party has booked for the guest, such third party shall be liable to STACEY together with the guest as joint debtor (Gesamtschuldner) for all obligations arising from the accommodation contract. In this case, such third party is the contractual party.",
      "Subletting of the Suites as well as their use for purposes other than accommodation require the prior consent of STACEY in text form. The same shall apply for use of the Suite by persons / visitors exceeding the stipulated number of persons foreseen in the contract.",
      "All claims against STACEY shall become time-barred one year after commencement of the statutory limitation period. This does not apply for claims of damages and other claims if the latter are based on an intentional or grossly negligent breach of duty by STACEY.",
    ],
  },
  {
    heading: "§3 Services, Prices, Payment, Set-off Claims",
    paragraphs: [
      "STACEY is obliged to provide the Suites booked by the guest or an equivalent replacement thereof, and to render the services agreed upon.",
      "The guest is obliged to pay the prices agreed upon or applicable for the provision of accommodation and for other services accepted by him and offered by STACEY. This shall also apply to services commissioned by the guest directly or via STACEY, which are provided by third parties and disbursed by STACEY.",
      "The agreed prices include the respectively applicable value added tax (\"VAT\"). Should the VAT rate applicable to the contractual services increase or decrease after conclusion of the contract, the prices will be adjusted accordingly.",
      "If the period between conclusion of the contract and fulfilment of the contract exceeds four months and if the price generally charged by STACEY for its respective services increases, STACEY is entitled to increase the contractually agreed price appropriately, but by no more than 10 %.",
      "STACEY may also adjust the applicable prices if the guest wishes to change the number of Suites booked, the service provided by STACEY or the length of stay after booking, provided, however, that STACEY agrees to such changes. Changes must be made in text form.",
      "If the guest has the possibility to indicate special non-contractual requests during the booking process, these shall be considered as non-binding for STACEY. The guest has no claim that the Suite complies with these non-contractual special requests, unless explicitly confirmed by STACEY in text form.",
      "Payment by means of the selected payment method are made through the booking software in full. The date of arrival is 4:00 p.m. of the booked day of arrival. STACEY is entitled to demand payment of accrued claims at any time and to demand immediate payment. In the event of default in payment, STACEY shall be entitled to demand the applicable statutory default interest as defined in section 288 German Civil Code (BGB). STACEY reserves the right to claim damages exceeding the amount of such statutory default interest.",
      "3.00 Euro will be charged for each reminder of payment upon the guest's default of payment. The guest may prove that such costs did not occur or did not occur in the requested amount.",
      "STACEY is entitled to request an appropriate advance payment or security payment upon conclusion of the accommodation contract or thereafter. The amount of the advance payment and the payment dates may be agreed in writing in the contract. In this case, STACEY is entitled to obtain fullfillment of claims from the security payment in the event that the guest does not comply with payment dates, e.g. by collecting the agreed remuneration by credit card.",
      "The guest may only set-off a claim by STACEY with a claim which is undisputed or decided with final, res judicata effect.",
      "In the event of payment default exceeding five calendar days after the due date, STACEY shall be entitled to terminate the accommodation contract with immediate effect and to demand that the guest vacates the Suite without further notice. This shall not affect STACEY's right to claim damages and outstanding payment. The guest shall not be entitled to continued use of the Suite in such case.",
    ],
  },
  {
    heading: "§4 Smoking Ban, Pets, Inclusion of Visitors, Disturbance of the Peace",
    paragraphs: [
      "The Suites of STACEY are non-smoking Suites. Therefore, smoking is not allowed in the Suites. This restriction includes e-cigarettes. In case of violation, STACEY is entitled to terminate the contract without notice. In addition, STACEY may, at its reasonable discretion, conduct a special final cleaning in case of a nicotine smell in the Suite. The costs for such cleaning amount to at least 250 EUR and shall be borne by the guest. STACEY reserves the right to charge any costs incurred in connection with the triggering of the fire alarm device through violation of the smoking ban to the guest. The guest may provide evidence that the actual cleaning cost was lower.",
      "The keeping of animals in the Suites of STACEY is not allowed. §4 section 1 sentence 3 and 4 apply accordingly.",
      "The guest is obligated to use the Suite only within the scope of the contractually agreed framework, in particular, only by the persons foreseen therein. Any overnight stays of visitors shall require the prior consent of STACEY in text form. In the event of violation, STACEY shall be entitled to invoice the guest a lump sum surcharge of EUR 100.00 per night and visitor as well as to terminate the lodging contract with immediate effect.",
      "To ensure a respectful and enjoyable environment for all guests, any actions that disrupt the peace, cause excessive noise, or create disturbances for others are strictly prohibited. This includes, but is not limited to, loud music, shouting, or any form of disruptive behavior that negatively impacts the experience of others. In particular, the organization or hosting of parties is strictly forbidden. Guests are expected to maintain a considerate and respectful atmosphere at all times. Failure to adhere to this policy may result in warnings, temporary suspension, permanent removal of access to our services, or the imposition of monetary fines as deemed appropriate. We reserve the right to assess and address disturbances on a case-by-case basis to maintain a peaceful environment for all.",
    ],
  },
  {
    heading: "§5 Provision, Handover and Return",
    paragraphs: [
      "The guest is not entitled to the provision of specific Suites.",
      "Booked Suites will be available to the guest from 4:00 p.m. of the agreed arrival day.",
      "On the agreed day of departure, the Suite must be vacated and returned to STACEY by no later than 11:00 a.m. STACEY may claim compensation for use exceeding this time of return as follows: 80 % of the regular daily price (list price), if return takes place by 6:00 p.m.; 100 % of the regular daily price (list price), if return does not take place by 6:00 p.m. Nothing in the above shall be construed as to granting any contractual claims to the guest. The guest is at liberty to prove that STACEY has suffered no or less damage. STACEY is at liberty to claim higher damages.",
      "The Suites must be returned in the condition in which they were handed over to the guest. The guest must remove all his personal belongings from the Suites and dispose of any garbage and any food he has brought with him. In the event of violation, STACEY shall be entitled to invoice the guest a special cleaning fee of EUR 50.00. The guest may provide evidence that the actual cleaning cost was lower.",
      "The Suites of STACEY may be booked for a maximum period of 182 consecutive days.",
      "Any booking or consecutive bookings beyond 182 days shall not create or be interpreted as a residential tenancy under German tenancy law. Each booking constitutes a separate and independent accommodation contract.",
    ],
  },
  {
    heading: "§6 Cancellation by the Guest or Non-Use of Services (No Show)",
    paragraphs: [
      "If the guest cancels the trip or does not appear on the day of arrival, STACEY is entitled to use the booked Suite for other purposes.",
      "The guest may only withdraw from the contract concluded with STACEY if STACEY expressly agrees to the cancellation of the contract.",
      "In case of early departure of the guest after check-in, a refund of the agreed remuneration is excluded for all booked services.",
    ],
  },
  {
    heading: "§7 Withdrawal of Stacey Real Estate GmbH",
    paragraphs: [
      "STACEY is entitled to withdraw from the contract at any time without giving reasons.",
      "STACEY is entitled to withdraw from the contract if an advance payment or security payment agreed upon in accordance with §3 section 9 is not made at the day of the signature of the contract.",
      "STACEY is also entitled to withdraw from the contract for objective reasons, for example if: (a) force majeure or other circumstances beyond the control of STACEY make it impossible to fulfil the contract; (b) the Suite has been booked under misleading or false statements of facts that are essential for the conclusion of the contract, such as facts relating to the guest or the purpose of contract; (c) STACEY has reasonable grounds to believe that the use of the booked Suites may adversely affect domestic tranquility, security interests or the public reputation of STACEY, without this being attributable to the sphere of control or organization of STACEY.",
      "STACEY shall inform the guest of the exercise of the right of withdrawal/cancellation without undue delay.",
      "The guest is not entitled to claim damages if STACEY rightfully withdraws from the contract.",
    ],
  },
  {
    heading: "§8 Technical Equipment and Connections",
    paragraphs: [
      "Use of the guest's own electrical devices using the Suite's electricity network is at the guest's own risk. Any malfunctions or damage to the Suite's technical equipment caused by the use of these devices shall be at the guest's expense, insofar as STACEY is not responsible for such malfunction or damage.",
      "The guest is prohibited from illegally sharing files via the Internet connection provided by STACEY. This includes any upload or download of copyrighted data in any form. The guest is liable for all damages caused to STACEY and/or the rights holder by the violation/infringement of rights.",
    ],
  },
  {
    heading: "§9 CCTV",
    paragraphs: [
      "The guest agrees to the usage of camera surveillance in the common spaces of the individual location. These are all spaces except for the private Suite. Camera surveillance is deemed to be particularly sensitive from a privacy perspective, and it is of great importance that all camera surveillance take place in accordance with the relevant legislation.",
    ],
  },
  {
    heading: "§10 Access of Stacey Real Estate GmbH",
    paragraphs: [
      "STACEY is entitled to enter the rented Suite for cleaning and, after consultation with the guest, to carry out repairs, to read electricity and water meters and to view the rented Suite as part of the follow-up rental of the Suite. In case of imminent danger, STACEY is also entitled to enter the Suite without the guest's consent.",
    ],
  },
  {
    heading: "§11 Duty of Care Obligations of the Guest, Liability of the Guest",
    paragraphs: [
      "The guest is obligated to treat the Suite and the inventory belonging thereto as well as the community facilities with due care and diligence and to prevent damage. In particular, the guest shall avoid excessive soiling, properly dispose of waste regularly and guarantee a minimum degree of order so the Suite can be maintained in a clean and hygienic defect-free condition within the framework of these standard cleaning measures. STACEY shall be entitled to invoice the guest in the full amount for the costs of any increased cleaning expenses due to substantially excessive soiling or disorder. Insofar as the guest fails to meet the afore-mentioned obligations also after a formal warning in text form, STACEY shall be entitled to terminate the lodging contract with immediate effect.",
      "The guest is liable for all damage to the building or inventory caused by himself or by visitors, employees or other third parties from his sphere of influence. Furthermore, the guest is also liable for all other damages and expenses incurred by STACEY due to improper use of the rental object or items brought in. This also includes costs incurred by STACEY due to the negligent activation of fire alarm systems (smoke detectors) (in particular costs of a chargeable fire brigade deployment).",
      "Each Suite contains an inventory list, on which the inventory existing in the respective Suite is specified. The guest is obliged to check this inventory list for completeness and to notify STACEY of any deviations from it without undue delay. Upon return of the Suite, the guest is obliged to reimburse STACEY for the costs of missing items at their respective current value.",
      "STACEY is entitled to settle costs for the repair of damage to the Suite or its inventory caused by negligence of the guest or any co-guests or visitors from the security payment provided by the guest in accordance with §3 section 9. STACEY will determine the costs for remedying the damage beforehand by obtaining a cost estimate from a contractor adequately qualified for the repair in question.",
      "The guest is obliged to make a reasonable contribution to rectifying the damage and keeping any possible damage to a minimum.",
    ],
  },
  {
    heading: "§12 Liability of Stacey Real Estate GmbH",
    paragraphs: [
      "STACEY shall be liable for damages caused by it resulting from injury to life, physical integrity or health as well as for other damages which are based on an intentional or grossly negligent breach of duty by STACEY or on an intentional or negligent breach of contract-typical duties of STACEY. A breach of duty by STACEY is equivalent to that of a legal representative or vicarious agent (Erfüllungsgehilfe). Further claims for damages are excluded, unless otherwise stipulated in this §12.",
      "As far as the guest is provided with a parking space on an in-house parking garage, this does not constitute a contract regarding safekeeping, regardless of the applicability of fees. STACEY shall only be liable for loss of or damage to motor vehicles and bicycles or their inventory parked or maneuvered on the property in accordance with the provisions of the above section 1.",
      "Messages, mail and consignments of goods for the guest shall be handled with due care. STACEY is not responsible for delivery & storage (except of prior approval of both parties), forwarding of the above. This does not constitute a contract regarding safekeeping.",
    ],
  },
  {
    heading: "§13 Concluding Provisions, House Rules",
    paragraphs: [
      "The contract is concluded in the English language.",
      "These terms and conditions also include compliance with our house rules, which are available in their respective current version via our homepage.",
      "Amendments or additions to the contract, the acceptance of STACEY's contractual offer, or to these terms and conditions for the rental of Suites shall be made in writing. Unilateral changes or additions by the guest are void.",
      "Place of performance and payment is the registered office of STACEY. Exclusive place of jurisdiction, also for cheque and exchange disputes, is the registered office of STACEY, provided that the guest is a businessman (Kaufmann) in the sense of the German Commercial Code (HGB). If a contractual party meets the requirements of section 38 paragraph 2 of the German Code of Civil Procedure (ZPO) and has no general place of jurisdiction in Germany, the place of jurisdiction shall be the registered office of STACEY.",
      "This contract shall be governed by the laws of the Federal Republic of Germany. The application of the UN Convention on Contracts for the International Sale of Goods (CISG) and provisions regarding the conflict of laws shall be excluded.",
      "Should any provision of these general terms and conditions and/or the contract regarding the rental of Suites be or become invalid or void, the validity of the remaining provisions shall not be affected. In this case the statutory provisions shall apply.",
    ],
  },
];
