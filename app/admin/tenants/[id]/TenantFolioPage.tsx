"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  X,
  Download,
  Mail,
  ChevronDown,
  Phone,
  Copy,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Printer,
  StickyNote,
  CreditCard,
  Euro,
  Archive,
  RefreshCw,
  Upload,
  MessageCircle,
  Flag,
  Zap,
  Landmark,
  FileText,
  ExternalLink,
  Send,
} from "lucide-react";
import { toast } from "@/components/admin/ui";
import WithdrawModal from "../WithdrawModal";
import DangerZone from "../DangerZone";
import MoveOutAdjustModal from "../MoveOutAdjustModal";

type Location = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
};

type Room = {
  id: string;
  roomNumber: string;
  category: string;
  monthlyRent: number;
  buildingAddress: string | null;
  floorDescription: string | null;
  apartment: {
    id: string;
    houseNumber: string;
    floor: string;
    label: string | null;
    location: Location;
  };
};

type Booking = {
  id: string;
  status: string;
  signatureDocumentId: string | null;
  bookingFeePaidAt: string | null;
  depositAmount: number | null;
  depositPaidAt: string | null;
  cancellationReason: string | null;
} | null;

type RentPayment = {
  id: string;
  month: string;
  amount: number;
  paidAmount: number;
  status: string;
  paidAt: string | null;
  failureReason: string | null;
  reminder1SentAt: string | null;
  mahnung1SentAt: string | null;
  mahnung2SentAt: string | null;
};

type ExtraCharge = {
  id: string;
  description: string;
  amount: number;
  month: string | null;
  paidAt: string | null;
  createdAt: string;
  type: "CHARGE" | "DISCOUNT";
  chargeOn: "NEXT_RENT" | "DEPOSIT_SETTLEMENT";
  stripePaymentIntentId: string | null;
};

type RentAdjustment = {
  id: string;
  month: string | null;
  originalAmount: number;
  adjustedAmount: number;
  reason: string;
  isPermanent: boolean;
  validFrom: string | null;
  createdAt: string;
};

type Defect = {
  id: string;
  description: string;
  deductionAmount: number;
  photos: string[];
  createdAt: string;
};

type Note = {
  id: string;
  content: string;
  tags: string[];
  sticky: boolean;
  followUpAt: string | null;
  createdBy: string | null;
  createdAt: string;
};

type TenantDocument = {
  id: string;
  filename: string;
  category: "CONTRACT" | "COMPLIANCE" | "FINANCIAL" | "CORRESPONDENCE" | "OTHER";
  url: string;
  description: string | null;
  uploadedBy: string | null;
  uploadedAt: string;
};

type TenantCommunication = {
  id: string;
  type: "PHONE" | "SMS" | "WHATSAPP" | "IN_PERSON" | "LETTER" | "OTHER";
  direction: "IN" | "OUT";
  summary: string;
  at: string;
  createdBy: string | null;
  createdAt: string;
};

export type Tenant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  street: string | null;
  zipCode: string | null;
  addressCity: string | null;
  country: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  language: string;
  paymentMethod: "SEPA" | "BANK_TRANSFER";
  monthlyRent: number;
  moveIn: string;
  moveOut: string | null;
  notice: string | null;
  archivedAt: string | null;
  stripeCustomerId: string | null;
  sepaMandateId: string | null;
  depositAmount: number | null;
  depositStatus: string;
  damagesAmount: number;
  arrearsAmount: number;
  depositRefundAmount: number | null;
  depositRefundIban: string | null;
  depositReturnedAt: string | null;
  welcomeEmailSentAt: string | null;
  paymentSetupRemindersSent: number;
  paymentFinalWarningSentAt: string | null;
  postStayFeedbackSentAt: string | null;
  updatedAt: string;
  roomId: string | null;
  room: Room;
  booking: Booking;
  rentPayments: RentPayment[];
  extraCharges: ExtraCharge[];
  rentAdjustments: RentAdjustment[];
  defects: Defect[];
  notes: Note[];
  documents: TenantDocument[];
  communications: TenantCommunication[];
  roomTransfers: {
    id: string;
    fromRoomId: string | null;
    toRoomId: string;
    transferDate: string;
    reason: string | null;
    oldMonthlyRent: number | null;
    newMonthlyRent: number | null;
    status: string;
    completedAt: string | null;
    fromRoom: { roomNumber: string } | null;
    toRoom: { roomNumber: string } | null;
  }[];
};

type AuditEvent = {
  id: string;
  at: string;
  module: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
};

type RelatedTenant = {
  id: string;
  firstName: string;
  lastName: string;
  moveIn: string;
  moveOut: string | null;
  roomId: string | null;
  room: { roomNumber: string } | null;
};


const TABS = [
  { id: "profile", label: "Profile" },
  { id: "lease", label: "Lease" },
  { id: "payments", label: "Payments" },
  { id: "deposit", label: "Deposit & defects" },
  { id: "emails", label: "Emails" },
  { id: "timeline", label: "Timeline" },
  { id: "documents", label: "Documents" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type SentEmail = {
  id: string;
  templateKey: string;
  recipient: string;
  subject: string | null;
  status: string;
  error: string | null;
  triggeredBy: string;
  sentAt: string;
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtMonth(d: string) {
  return new Date(d).toLocaleDateString("de-DE", {
    month: "short",
    year: "numeric",
  });
}

function fmtEuro(cents: number | null, digits: 0 | 2 = 0) {
  if (cents === null) return "—";
  return `€${(cents / 100).toFixed(digits)}`;
}

function formatCategory(cat: string) {
  return cat
    .replace(/_/g, " ")
    .replace(/PLUS/g, "+")
    .split(" ")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export default function TenantFolioPage({
  tenant,
  sentEmails,
  auditEvents,
  relatedTenants,
  withdrawEligible,
}: {
  tenant: Tenant;
  sentEmails: SentEmail[];
  auditEvents: AuditEvent[];
  relatedTenants: RelatedTenant[];
  withdrawEligible: boolean;
}) {
  const router = useRouter();
  // Support ?tab=lease deep-links from the tenants list
  const [tab, setTab] = useState<TabId>(() => {
    if (typeof window === "undefined") return "profile";
    const p = new URLSearchParams(window.location.search).get("tab");
    const valid: TabId[] = ["profile", "lease", "payments", "deposit", "emails", "timeline", "documents"];
    return valid.includes(p as TabId) ? (p as TabId) : "profile";
  });
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [showCharge, setShowCharge] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showCommunication, setShowCommunication] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const hasDeposit = Boolean(tenant.booking?.depositPaidAt);

  // Keep URL ?tab=… in sync (so deep-links from emails/audit land here)
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") !== tab) {
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  }, [tab]);

  // When switching tabs, make sure the top of the new content is visible.
  // If we scrolled down in the previous tab, the new tab's first block would
  // otherwise sit above the sticky tab bar (hidden behind the admin header +
  // folio tabs). Scroll the tab bar into view — content starts directly below.
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const el = tabsRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Admin header is 56px tall (sticky top-0 h-14). We target 56px so the
    // folio tab bar sits flush under it.
    if (rect.top < 56 || rect.top > 120) {
      const targetTop = rect.top + window.scrollY - 56;
      window.scrollTo({ top: targetTop, behavior: "smooth" });
    }
  }, [tab]);

  // ─── Balance + status ──────────────────────────────────────
  const openBalance = tenant.rentPayments.reduce(
    (sum, p) => sum + Math.max(0, p.amount - p.paidAmount),
    0
  );
  const extraChargesOpen = tenant.extraCharges
    .filter((c) => !c.paidAt && c.type === "CHARGE")
    .reduce((sum, c) => sum + c.amount, 0);
  const totalOpen = openBalance + extraChargesOpen;

  // Multi-chip status — can be several at once
  const statusChips = buildStatusChips({
    tenant,
    withdrawEligible,
    totalOpen,
  });

  // Per-tab open-count badges
  const tabBadges: Partial<Record<TabId, number>> = {
    payments:
      tenant.rentPayments.filter((p) => p.status === "FAILED").length +
      tenant.extraCharges.filter((c) => !c.paidAt && c.type === "CHARGE").length,
    deposit:
      tenant.defects.length +
      (tenant.moveOut &&
      new Date(tenant.moveOut) < new Date() &&
      tenant.depositStatus === "RECEIVED"
        ? 1
        : 0),
    emails: sentEmails.filter((e) => e.status === "failed").length,
    timeline: tenant.notes.filter((n) => n.followUpAt && new Date(n.followUpAt) <= new Date()).length,
  };

  // Next-action suggestions
  const nextActions = buildNextActions({ tenant, totalOpen, sentEmails });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray print:hidden">
        <Link
          href="/admin/tenants"
          className="inline-flex items-center gap-1.5 hover:text-black"
        >
          <ArrowLeft className="w-4 h-4" />
          Tenants
        </Link>
        <span className="text-gray/60">/</span>
        <span>{tenant.room.apartment.location.name}</span>
        <span className="text-gray/60">/</span>
        <span className="text-black">
          {tenant.firstName} {tenant.lastName}
        </span>
      </div>

      {/* ── Hero ── */}
      <div className="bg-white rounded-[5px] border border-lightgray p-6 print:border-black">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <Avatar
              firstName={tenant.firstName}
              lastName={tenant.lastName}
              archived={Boolean(tenant.archivedAt)}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-black">
                  {tenant.firstName} {tenant.lastName}
                </h1>
                {tenant.country && <FlagChip country={tenant.country} />}
                {tenant.archivedAt && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[10px] font-semibold uppercase bg-gray-200 text-gray-700">
                    <Archive className="w-3 h-3" /> Archived
                  </span>
                )}
              </div>
              <div className="text-sm text-gray mt-1">
                #{tenant.room.roomNumber} · {tenant.room.apartment.location.name} ·{" "}
                {formatCategory(tenant.room.category)}
              </div>
              <div className="text-xs text-gray mt-1 flex items-center gap-3 flex-wrap">
                <span>
                  Move-in {fmtDate(tenant.moveIn)}{" "}
                  <DaysSincePill date={tenant.moveIn} />
                </span>
                {tenant.moveOut && (
                  <span>
                    · Move-out {fmtDate(tenant.moveOut)}{" "}
                    <DaysUntilPill date={tenant.moveOut} />
                  </span>
                )}
              </div>

              {/* Contact info */}
              <div className="flex items-center gap-3 mt-3 flex-wrap print:mt-2">
                <ContactLink
                  icon={<Mail className="w-3.5 h-3.5" />}
                  label={tenant.email}
                  href={`mailto:${tenant.email}`}
                />
                {tenant.phone && (
                  <ContactLink
                    icon={<Phone className="w-3.5 h-3.5" />}
                    label={tenant.phone}
                    href={`tel:${tenant.phone}`}
                  />
                )}
                <PaymentMethodChip method={tenant.paymentMethod} />
              </div>

              {/* Status chips */}
              {statusChips.length > 0 && (
                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  {statusChips.map((c, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[11px] font-semibold ${c.tone}`}
                      title={c.title}
                    >
                      {c.icon}
                      {c.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 print:hidden">
            {hasDeposit && (
              <button
                onClick={() => setShowWithdraw(true)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-[5px] text-xs font-medium border ${
                  withdrawEligible
                    ? "border-orange-300 text-orange-700 hover:bg-orange-50"
                    : "border-lightgray text-gray hover:bg-background-alt"
                }`}
                title={
                  withdrawEligible
                    ? "Innerhalb der 14-Tage-Frist seit Kautionszahlung"
                    : "Frist abgelaufen — Override mit Warnung möglich"
                }
              >
                Widerruf bearbeiten
              </button>
            )}
            <ResendEmailDropdown tenantId={tenant.id} />
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[5px] text-xs font-medium border border-lightgray hover:bg-background-alt"
              title="Print folio"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>
        </div>

        {/* Next-actions widget */}
        {nextActions.length > 0 && (
          <div className="mt-5 pt-4 border-t border-lightgray print:hidden">
            <div className="text-[11px] uppercase tracking-wide text-gray mb-2 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Next actions
            </div>
            <div className="space-y-1.5">
              {nextActions.map((a, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between gap-3 text-sm rounded-[5px] px-2 py-1.5 ${a.tone}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {a.icon}
                    <span className="truncate">{a.label}</span>
                  </div>
                  {a.action && (
                    <button
                      onClick={a.action.onClick}
                      className="text-xs font-medium underline hover:no-underline whitespace-nowrap"
                    >
                      {a.action.label}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick-action bar */}
        <div className="mt-5 pt-4 border-t border-lightgray flex items-center gap-2 flex-wrap print:hidden">
          <button
            onClick={() => setShowNote(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] text-xs font-medium border border-lightgray hover:bg-background-alt"
          >
            <StickyNote className="w-3.5 h-3.5" /> Note
          </button>
          <button
            onClick={() => setShowCharge(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] text-xs font-medium border border-lightgray hover:bg-background-alt"
          >
            <Plus className="w-3.5 h-3.5" /> Charge / Discount
          </button>
          <button
            onClick={() => setShowRecordPayment(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] text-xs font-medium border border-lightgray hover:bg-background-alt"
          >
            <Euro className="w-3.5 h-3.5" /> Record payment
          </button>
          <button
            onClick={() => setShowCommunication(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] text-xs font-medium border border-lightgray hover:bg-background-alt"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Log call / chat
          </button>
        </div>
      </div>

      {showWithdraw && (
        <WithdrawModal
          tenantId={tenant.id}
          tenantName={`${tenant.firstName} ${tenant.lastName}`}
          depositPaidAt={tenant.booking?.depositPaidAt ?? null}
          moveIn={tenant.moveIn}
          monthlyRent={tenant.monthlyRent}
          depositAmount={tenant.depositAmount ?? tenant.monthlyRent * 2}
          paidRentsCents={tenant.rentPayments
            .filter((r) => r.status === "PAID")
            .reduce((sum, r) => sum + r.paidAmount, 0)}
          onClose={() => setShowWithdraw(false)}
          onSuccess={() => router.push("/admin/tenants")}
        />
      )}

      <div
        ref={tabsRef}
        className="bg-white rounded-[5px] border border-lightgray scroll-mt-16"
      >
        <div className="border-b border-lightgray flex overflow-x-auto sticky top-14 bg-white z-20 rounded-t-[5px] shadow-[0_1px_0_rgba(0,0,0,0.04)] print:hidden">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors inline-flex items-center gap-1.5 ${
                tab === t.id
                  ? "border-black text-black"
                  : "border-transparent text-gray hover:text-black"
              }`}
            >
              {t.label}
              {tabBadges[t.id] && tabBadges[t.id]! > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                  {tabBadges[t.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "profile" && <ProfileTab tenant={tenant} auditEvents={auditEvents} />}
          {tab === "lease" && <LeaseTab tenant={tenant} relatedTenants={relatedTenants} />}
          {tab === "payments" && <PaymentsTab tenant={tenant} />}
          {tab === "deposit" && <DepositTab tenant={tenant} />}
          {tab === "emails" && <EmailsTab sentEmails={sentEmails} onChanged={() => router.refresh()} />}
          {tab === "timeline" && <TimelineTab tenant={tenant} auditEvents={auditEvents} />}
          {tab === "documents" && <DocumentsTab tenant={tenant} />}
        </div>
      </div>

      <DangerZone
        tenantId={tenant.id}
        tenantName={`${tenant.firstName} ${tenant.lastName}`}
        archivedAt={tenant.archivedAt}
      />

      {showNote && (
        <NoteModal
          tenantId={tenant.id}
          onClose={() => setShowNote(false)}
          onSaved={() => {
            setShowNote(false);
            router.refresh();
          }}
        />
      )}
      {showCharge && (
        <ExtraChargeModal
          tenantId={tenant.id}
          onClose={() => setShowCharge(false)}
          onSaved={() => {
            setShowCharge(false);
            router.refresh();
          }}
        />
      )}
      {showRecordPayment && (
        <RecordPaymentModal
          tenant={tenant}
          onClose={() => setShowRecordPayment(false)}
          onSaved={() => {
            setShowRecordPayment(false);
            router.refresh();
          }}
        />
      )}
      {showCommunication && (
        <CommunicationModal
          tenantId={tenant.id}
          onClose={() => setShowCommunication(false)}
          onSaved={() => {
            setShowCommunication(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/* ─── Header helpers (chips, badges, widgets) ──────────── */

function Avatar({
  firstName,
  lastName,
  archived,
}: {
  firstName: string;
  lastName: string;
  archived: boolean;
}) {
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  return (
    <div
      className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${
        archived
          ? "bg-gray-200 text-gray-500"
          : "bg-pink/20 text-black"
      }`}
      aria-hidden
    >
      {initials}
    </div>
  );
}

function FlagChip({ country }: { country: string }) {
  // Lookup emoji flag for a 2-letter code. Fall back to plain code.
  const c = country.trim().toUpperCase();
  const isIso = /^[A-Z]{2}$/.test(c);
  const flag = isIso
    ? String.fromCodePoint(
        ...c.split("").map((ch) => 127397 + ch.charCodeAt(0))
      )
    : null;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs text-gray"
      title={country}
    >
      {flag ? <span className="text-base leading-none">{flag}</span> : <Flag className="w-3 h-3" />}
      {!flag && c}
    </span>
  );
}

function DaysSincePill({ date }: { date: string }) {
  const [nowTs] = useState(() => Date.now());
  const d = Math.floor((nowTs - new Date(date).getTime()) / 86_400_000);
  if (d < 0) return null;
  if (d === 0) return <span className="text-gray">(today)</span>;
  return <span className="text-gray">· day {d + 1}</span>;
}

function DaysUntilPill({ date }: { date: string }) {
  const [nowTs] = useState(() => Date.now());
  const d = Math.ceil((new Date(date).getTime() - nowTs) / 86_400_000);
  if (d < 0)
    return <span className="text-gray">({-d}d ago)</span>;
  if (d === 0) return <span className="text-orange-600">(today)</span>;
  return (
    <span className={d <= 30 ? "text-orange-600" : "text-gray"}>
      (in {d}d)
    </span>
  );
}

function ContactLink({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  const [copied, setCopied] = useState(false);
  function copy() {
    void navigator.clipboard.writeText(label);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }
  return (
    <div className="inline-flex items-center gap-1 text-xs">
      <a
        href={href}
        className="inline-flex items-center gap-1 text-gray hover:text-black"
      >
        {icon}
        <span className="font-medium">{label}</span>
      </a>
      <button
        onClick={copy}
        className="p-0.5 text-gray/60 hover:text-black print:hidden"
        aria-label="Copy"
        title={copied ? "Copied!" : "Copy"}
      >
        {copied ? (
          <CheckCircle2 className="w-3 h-3 text-green-600" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </button>
    </div>
  );
}

function PaymentMethodChip({ method }: { method: "SEPA" | "BANK_TRANSFER" }) {
  if (method === "SEPA") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <Zap className="w-2.5 h-2.5" /> SEPA
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
      <Landmark className="w-2.5 h-2.5" /> Bank transfer
    </span>
  );
}

type StatusChip = {
  label: string;
  icon?: React.ReactNode;
  tone: string;
  title?: string;
};

function buildStatusChips({
  tenant,
  withdrawEligible,
  totalOpen,
}: {
  tenant: Tenant;
  withdrawEligible: boolean;
  totalOpen: number;
}): StatusChip[] {
  const chips: StatusChip[] = [];
  const now = new Date();
  const moveOut = tenant.moveOut ? new Date(tenant.moveOut) : null;

  if (tenant.archivedAt) {
    return [
      {
        label: "Archived",
        tone: "bg-gray-200 text-gray-700",
        icon: <Archive className="w-3 h-3" />,
      },
    ];
  }

  // Active / Leaving / Moved-out
  if (moveOut && moveOut < now) {
    chips.push({ label: "Moved out", tone: "bg-gray-100 text-gray-700" });
  } else if (tenant.notice) {
    const daysToLeave = Math.ceil(
      ((moveOut?.getTime() ?? now.getTime()) - now.getTime()) / 86_400_000
    );
    chips.push({
      label: `Leaving in ${daysToLeave}d`,
      tone: "bg-yellow-100 text-yellow-700",
    });
  } else {
    chips.push({ label: "Active", tone: "bg-green-100 text-green-700" });
  }

  // Overdue / failed rent
  if (tenant.rentPayments.some((p) => p.status === "FAILED")) {
    chips.push({
      label: "Rent failed",
      tone: "bg-red-100 text-red-700",
      icon: <AlertCircle className="w-3 h-3" />,
    });
  }
  if (totalOpen > 0) {
    chips.push({
      label: `Open €${(totalOpen / 100).toFixed(0)}`,
      tone: "bg-red-100 text-red-700",
    });
  }

  // Widerruf active
  if (withdrawEligible) {
    chips.push({
      label: "Widerruf period",
      tone: "bg-orange-100 text-orange-700",
    });
  }

  // Deposit settlement overdue (>6 weeks after moveOut)
  if (
    moveOut &&
    moveOut < now &&
    tenant.depositStatus === "RECEIVED" &&
    (now.getTime() - moveOut.getTime()) / 86_400_000 > 42
  ) {
    chips.push({
      label: "Deposit overdue",
      tone: "bg-red-100 text-red-800 font-bold",
      icon: <AlertTriangle className="w-3 h-3" />,
    });
  }

  // Missing IBAN on move-out
  if (
    moveOut &&
    moveOut < now &&
    tenant.depositStatus === "RECEIVED" &&
    !tenant.depositRefundIban
  ) {
    chips.push({
      label: "IBAN missing",
      tone: "bg-orange-100 text-orange-700",
    });
  }

  return chips;
}

type NextAction = {
  label: string;
  icon: React.ReactNode;
  tone: string;
  action?: { label: string; onClick: () => void };
};

function buildNextActions({
  tenant,
  totalOpen,
  sentEmails,
}: {
  tenant: Tenant;
  totalOpen: number;
  sentEmails: SentEmail[];
}): NextAction[] {
  const actions: NextAction[] = [];
  const now = new Date();
  const moveIn = new Date(tenant.moveIn);
  const moveOut = tenant.moveOut ? new Date(tenant.moveOut) : null;
  const daysInHouse = Math.floor(
    (now.getTime() - moveIn.getTime()) / 86_400_000
  );

  // Welcome not sent after move-in
  if (
    moveIn <= now &&
    !tenant.welcomeEmailSentAt &&
    !sentEmails.some((e) => e.templateKey === "welcome" && e.status === "sent")
  ) {
    actions.push({
      label: `Welcome email not sent yet (day ${Math.max(1, daysInHouse + 1)})`,
      icon: <Mail className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />,
      tone: "bg-orange-50 text-orange-900",
    });
  }

  // No payment method set & SEPA tenant
  if (
    tenant.paymentMethod === "SEPA" &&
    !tenant.sepaMandateId &&
    moveIn <= now
  ) {
    actions.push({
      label: "No SEPA mandate — monthly charges will fail",
      icon: <CreditCard className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />,
      tone: "bg-red-50 text-red-900",
    });
  }

  // Failed rents
  const failedRents = tenant.rentPayments.filter((p) => p.status === "FAILED");
  if (failedRents.length > 0) {
    const oldest = failedRents.sort(
      (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()
    )[0];
    const daysOpen = Math.floor(
      (now.getTime() - new Date(oldest.month).getTime()) / 86_400_000
    );
    const stage =
      daysOpen >= 30 && !oldest.mahnung2SentAt
        ? "2. Mahnung"
        : daysOpen >= 14 && !oldest.mahnung1SentAt
          ? "1. Mahnung"
          : daysOpen >= 3 && !oldest.reminder1SentAt
            ? "Erinnerung"
            : null;
    if (stage) {
      actions.push({
        label: `${stage} fällig — ${failedRents.length} offene Miete(n), €${(totalOpen / 100).toFixed(0)}`,
        icon: <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />,
        tone: "bg-red-50 text-red-900",
      });
    }
  }

  // Deposit settlement overdue or due
  if (
    moveOut &&
    moveOut < now &&
    tenant.depositStatus === "RECEIVED"
  ) {
    const daysSinceMO = Math.floor(
      (now.getTime() - moveOut.getTime()) / 86_400_000
    );
    const daysLeft = 42 - daysSinceMO;
    if (daysLeft < 0) {
      actions.push({
        label: `Kautionsabrechnung überfällig (${-daysLeft}d über 6 Wochen)`,
        icon: <AlertTriangle className="w-3.5 h-3.5 text-red-700 flex-shrink-0" />,
        tone: "bg-red-50 text-red-900",
      });
    } else if (daysLeft <= 14) {
      actions.push({
        label: `Kautionsabrechnung in ${daysLeft}d fällig`,
        icon: <AlertCircle className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />,
        tone: "bg-orange-50 text-orange-900",
      });
    }
  }

  // Follow-ups from notes due today
  const dueFollowUps = tenant.notes.filter(
    (n) => n.followUpAt && new Date(n.followUpAt) <= now
  );
  if (dueFollowUps.length > 0) {
    actions.push({
      label: `${dueFollowUps.length} follow-up${dueFollowUps.length === 1 ? "" : "s"} due`,
      icon: <StickyNote className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />,
      tone: "bg-blue-50 text-blue-900",
    });
  }

  return actions;
}

// ─── Tab 1: Profile ────────────────────────────────────────

function ProfileTab({
  tenant,
  auditEvents,
}: {
  tenant: Tenant;
  auditEvents: AuditEvent[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: tenant.email,
    phone: tenant.phone ?? "",
    street: tenant.street ?? "",
    zipCode: tenant.zipCode ?? "",
    addressCity: tenant.addressCity ?? "",
    country: tenant.country ?? "",
    emergencyContactName: tenant.emergencyContactName ?? "",
    emergencyContactPhone: tenant.emergencyContactPhone ?? "",
    language: tenant.language ?? "en",
  });

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error("Save failed", { description: data.error ?? res.statusText });
      }
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="space-y-3 max-w-xl">
        <div className="text-xs text-gray bg-background-alt rounded-[5px] p-3 border border-lightgray">
          Name and date of birth are taken from the signed lease and cannot be edited here.
        </div>
        <Field label="Name (read-only)" value={`${tenant.firstName} ${tenant.lastName}`} />
        <Field label="Date of birth (read-only)" value={fmtDate(tenant.dateOfBirth)} />

        <FormInput label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <FormInput label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <FormInput label="Street" value={form.street} onChange={(v) => setForm({ ...form, street: v })} />
        <div className="grid grid-cols-[100px_1fr] gap-2">
          <FormInput label="ZIP" value={form.zipCode} onChange={(v) => setForm({ ...form, zipCode: v })} />
          <FormInput label="City" value={form.addressCity} onChange={(v) => setForm({ ...form, addressCity: v })} />
        </div>
        <FormInput label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />

        <div className="pt-2 border-t border-lightgray mt-4">
          <div className="text-xs text-gray mb-2 uppercase tracking-wide font-semibold">
            Emergency contact
          </div>
          <FormInput
            label="Name"
            value={form.emergencyContactName}
            onChange={(v) => setForm({ ...form, emergencyContactName: v })}
          />
          <FormInput
            label="Phone"
            value={form.emergencyContactPhone}
            onChange={(v) => setForm({ ...form, emergencyContactPhone: v })}
          />
        </div>

        <div className="pt-2 border-t border-lightgray">
          <label className="block">
            <span className="block text-xs text-gray mb-1">Preferred language (for emails)</span>
            <select
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
            >
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </label>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-black text-white rounded-[5px] text-sm font-medium hover:bg-black/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-4 py-2 border border-lightgray rounded-[5px] text-sm hover:bg-background-alt"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const lastProfileEdit = auditEvents.find(
    (e) => e.module === "tenant" && e.action === "patch_profile"
  );

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex justify-end">
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 text-sm text-gray hover:text-black"
        >
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </button>
      </div>

      <div className="space-y-2">
        <InfoRow label="Name" value={`${tenant.firstName} ${tenant.lastName}`} />
        <InfoRow label="Date of birth" value={fmtDate(tenant.dateOfBirth)} />
        <InfoRow
          label="Language"
          value={tenant.language === "de" ? "Deutsch" : "English"}
        />
      </div>

      <div className="pt-3 border-t border-lightgray space-y-2">
        <div className="text-[10px] uppercase tracking-wide text-gray font-semibold">
          Contact
        </div>
        <InfoRow label="Email" value={tenant.email} />
        <InfoRow label="Phone" value={tenant.phone ?? "—"} />
        <div className="flex items-start text-sm">
          <div className="w-40 text-gray flex-shrink-0">Address</div>
          <div className="flex-1 text-black">
            {tenant.street ? (
              <>
                <div>{tenant.street}</div>
                <div>
                  {[tenant.zipCode, tenant.addressCity]
                    .filter(Boolean)
                    .join(" ")}
                </div>
                {tenant.country && <div>{tenant.country}</div>}
              </>
            ) : (
              "—"
            )}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-lightgray space-y-2">
        <div className="text-[10px] uppercase tracking-wide text-gray font-semibold">
          Emergency contact
        </div>
        <InfoRow
          label="Name"
          value={tenant.emergencyContactName ?? "—"}
        />
        <InfoRow
          label="Phone"
          value={tenant.emergencyContactPhone ?? "—"}
        />
      </div>

      <div className="pt-3 border-t border-lightgray text-[10px] text-gray">
        {lastProfileEdit
          ? `Last updated ${new Date(lastProfileEdit.at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}`
          : `Created ${fmtDate(tenant.updatedAt)}`}
      </div>
    </div>
  );
}

// ─── Tab 2: Lease ──────────────────────────────────────────

function LeaseTab({
  tenant,
  relatedTenants,
}: {
  tenant: Tenant;
  relatedTenants: RelatedTenant[];
}) {
  const router = useRouter();
  const [showMoveOutAdjust, setShowMoveOutAdjust] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [changingPaymentMethod, setChangingPaymentMethod] = useState(false);
  const addr = tenant.room?.apartment.location.address ?? "";

  // Pass all PAID/PARTIAL rents to the modal — it picks the right month
  // based on whatever date the admin chooses.
  const paidRents = tenant.rentPayments
    .filter((r) => r.status === "PAID" || r.status === "PARTIAL")
    .map((r) => ({ month: r.month, paidAmount: r.paidAmount }));

  async function togglePaymentMethod() {
    const next =
      tenant.paymentMethod === "SEPA" ? "BANK_TRANSFER" : "SEPA";
    if (
      !confirm(
        `Change payment method to ${next === "SEPA" ? "SEPA (auto-charge)" : "Bank Transfer (manual)"}?`
      )
    )
      return;
    setChangingPaymentMethod(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: next }),
      });
      if (res.ok) router.refresh();
      else toast.error("Change failed");
    } finally {
      setChangingPaymentMethod(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-wide text-gray font-semibold">
          Property
        </div>
        <InfoRow label="Location" value={tenant.room.apartment.location.name} />
        <InfoRow label="Address" value={addr} />
        <InfoRow
          label="Apartment"
          value={tenant.room.apartment.label ?? tenant.room.apartment.floor}
        />
        <InfoRow
          label="House number"
          value={tenant.room.buildingAddress ?? tenant.room.apartment.houseNumber}
        />
        <InfoRow
          label="Floor"
          value={tenant.room.floorDescription ?? tenant.room.apartment.floor}
        />
        <InfoRow label="Suite" value={`#${tenant.room?.roomNumber ?? "—"}`} />
        <InfoRow
          label="Category"
          value={formatCategory(tenant.room?.category ?? "")}
        />
        <InfoRow label="Monthly rent" value={fmtEuro(tenant.monthlyRent)} />
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setShowTransfer(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-lightgray rounded-[5px] hover:bg-background-alt"
          >
            Transfer room
          </button>
        </div>
      </div>

      <div className="pt-3 border-t border-lightgray space-y-2">
        <div className="text-[10px] uppercase tracking-wide text-gray font-semibold">
          Dates
        </div>
        <InfoRow label="Move-in" value={fmtDate(tenant.moveIn)} />
        <div className="flex items-start text-sm">
          <div className="w-40 text-gray flex-shrink-0">Move-out</div>
          <div className="flex-1 text-black flex items-center gap-3">
            <span>{fmtDate(tenant.moveOut)}</span>
            <button
              onClick={() => setShowMoveOutAdjust(true)}
              className="text-xs text-gray hover:text-black underline"
            >
              anpassen
            </button>
          </div>
        </div>
        <InfoRow label="Notice" value={fmtDate(tenant.notice)} />
        {tenant.booking?.bookingFeePaidAt && (
          <InfoRow
            label="Booking fee paid"
            value={fmtDate(tenant.booking.bookingFeePaidAt)}
          />
        )}
      </div>

      {/* Payment method */}
      <div className="pt-3 border-t border-lightgray space-y-2">
        <div className="text-[10px] uppercase tracking-wide text-gray font-semibold">
          Payment
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="w-40 text-gray flex-shrink-0">Method</span>
            <PaymentMethodChip method={tenant.paymentMethod} />
          </div>
          <button
            onClick={togglePaymentMethod}
            disabled={changingPaymentMethod}
            className="text-xs text-gray hover:text-black underline disabled:opacity-50"
          >
            {changingPaymentMethod
              ? "…"
              : tenant.paymentMethod === "SEPA"
                ? "Switch to Bank Transfer"
                : "Switch to SEPA"}
          </button>
        </div>
        {tenant.sepaMandateId && (
          <InfoRow
            label="SEPA mandate"
            value={
              tenant.sepaMandateId === "legacy_manual"
                ? "legacy (pre-system)"
                : tenant.sepaMandateId.slice(0, 20) + "…"
            }
          />
        )}
      </div>

      {/* Lease docs */}
      <div className="pt-3 border-t border-lightgray space-y-2">
        <div className="text-[10px] uppercase tracking-wide text-gray font-semibold">
          Lease documents
        </div>
        <div className="flex items-start text-sm">
          <div className="w-40 text-gray flex-shrink-0">Signed lease</div>
          <div className="flex-1 text-black">
            {tenant.booking?.signatureDocumentId ? (
              <span className="inline-flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-green-700" />
                Signed via Yousign — archived to Google Drive
              </span>
            ) : (
              <span className="text-gray">Not signed yet</span>
            )}
          </div>
        </div>
        {tenant.booking?.cancellationReason && (
          <InfoRow
            label="Cancellation reason"
            value={tenant.booking.cancellationReason}
          />
        )}
      </div>

      {/* Lease terms (static, product info) */}
      <div className="pt-3 border-t border-lightgray">
        <div className="text-[10px] uppercase tracking-wide text-gray font-semibold mb-2">
          Terms
        </div>
        <div className="text-xs text-gray space-y-1">
          <div>• Mindestlaufzeit: 3 Monate</div>
          <div>• Kündigungsfrist: 3 Monate zum Monatsende</div>
          <div>• Kaution: 2× Monatsmiete</div>
          <div>• Rückzahlung Kaution: max. 6 Wochen nach Auszug</div>
          <div>• Check-in ab 16:00, Check-out bis 11:00</div>
        </div>
      </div>

      {showMoveOutAdjust && (
        <MoveOutAdjustModal
          tenantId={tenant.id}
          tenantName={`${tenant.firstName} ${tenant.lastName}`}
          monthlyRentCents={tenant.monthlyRent}
          moveIn={tenant.moveIn}
          currentMoveOut={tenant.moveOut}
          paidRents={paidRents}
          onClose={() => setShowMoveOutAdjust(false)}
          onSuccess={() => {
            setShowMoveOutAdjust(false);
            router.refresh();
          }}
        />
      )}

      {showTransfer && (
        <RoomTransferModal
          tenantId={tenant.id}
          tenantName={`${tenant.firstName} ${tenant.lastName}`}
          currentRoomId={tenant.roomId}
          currentRoomNumber={tenant.room?.roomNumber ?? "—"}
          currentRent={tenant.monthlyRent}
          locationId={tenant.room?.apartment.location.id ?? ""}
          onClose={() => setShowTransfer(false)}
          onSuccess={() => {
            setShowTransfer(false);
            router.refresh();
          }}
        />
      )}

      {/* Transfer history */}
      {tenant.roomTransfers && tenant.roomTransfers.length > 0 && (
        <>
          <div className="border-t border-lightgray my-4" />
          <div className="text-xs text-gray uppercase tracking-wide font-semibold mb-2">
            Room transfer history
          </div>
          <div className="space-y-1">
            {tenant.roomTransfers.map((t) => (
              <div
                key={t.id}
                className={`text-sm flex items-center gap-2 ${t.status === "CANCELLED" ? "line-through text-gray" : ""}`}
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                    t.status === "COMPLETED"
                      ? "bg-green-500"
                      : t.status === "SCHEDULED"
                        ? "bg-orange-400"
                        : "bg-gray-300"
                  }`}
                />
                <span>{fmtDate(t.transferDate)}</span>
                <span className="text-gray">→</span>
                <span>{t.toRoom?.roomNumber ?? t.toRoomId}</span>
                {t.newMonthlyRent && (
                  <span className="text-gray text-xs">
                    (€{((t.oldMonthlyRent ?? 0) / 100).toFixed(0)} → €{(t.newMonthlyRent / 100).toFixed(0)})
                  </span>
                )}
                {t.reason && (
                  <span className="text-gray text-xs italic">— {t.reason}</span>
                )}
                {t.status === "SCHEDULED" && (
                  <>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-[5px] bg-orange-100 text-orange-700 font-semibold">
                      SCHEDULED
                    </span>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm("Geplanten Zimmerwechsel stornieren?")) return;
                        const res = await fetch(
                          `/api/admin/tenants/${tenant.id}/transfer`,
                          {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ transferId: t.id }),
                          }
                        );
                        if (res.ok) router.refresh();
                        else toast.error("Stornierung fehlgeschlagen");
                      }}
                      className="text-[10px] text-red-600 hover:text-red-800 underline"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Related tenants (same apartment) */}
      {relatedTenants.length > 0 && (
        <div className="pt-3 border-t border-lightgray">
          <div className="text-[10px] uppercase tracking-wide text-gray font-semibold mb-2">
            Related tenants · same apartment
          </div>
          <div className="space-y-1">
            {relatedTenants.map((r) => {
              const current =
                !r.moveOut || new Date(r.moveOut) >= new Date();
              return (
                <Link
                  key={r.id}
                  href={`/admin/tenants/${r.id}`}
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <span
                    className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${current ? "bg-green-500" : "bg-gray-300"}`}
                  />
                  <span className="font-medium">
                    {r.firstName} {r.lastName}
                  </span>
                  <span className="text-xs text-gray">
                    #{r.room?.roomNumber ?? "—"} · {fmtDate(r.moveIn)}
                    {r.moveOut ? ` → ${fmtDate(r.moveOut)}` : " · active"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Payments ───────────────────────────────────────

function PaymentsTab({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [showCharge, setShowCharge] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [busyRent, setBusyRent] = useState<string | null>(null);
  const [payModalRent, setPayModalRent] = useState<RentPayment | null>(null);

  const totalPaid = tenant.rentPayments.reduce((s, p) => s + p.paidAmount, 0);
  // Split open vs credit: positive deltas are arrears, negative are credit
  // (e.g. moveOut shortened after rent was already collected).
  const openRent = tenant.rentPayments.reduce(
    (s, p) => s + Math.max(0, p.amount - p.paidAmount),
    0
  );
  const rentCredit = tenant.rentPayments.reduce(
    (s, p) => s + Math.max(0, p.paidAmount - p.amount),
    0
  );

  async function retryCharge(rentPaymentId: string) {
    setBusyRent(rentPaymentId);
    try {
      const res = await fetch(
        `/api/admin/rent-payments/${rentPaymentId}/retry`,
        { method: "POST" }
      );
      const data = await res.json().catch(() => ({}));
      toast.info(data.message ?? "Done");
      router.refresh();
    } finally {
      setBusyRent(null);
    }
  }

  function mahnungLabel(rp: RentPayment): string {
    if (rp.mahnung2SentAt) return "2. Mahnung";
    if (rp.mahnung1SentAt) return "1. Mahnung";
    if (rp.reminder1SentAt) return "Reminded";
    return "";
  }

  async function exportCsv() {
    const header = [
      "Month",
      "Due (EUR)",
      "Paid (EUR)",
      "Open (EUR)",
      "Status",
      "Paid at",
      "Mahnung",
      "Failure",
    ].join(";");
    const rows = tenant.rentPayments.map((p) => {
      const open = Math.max(0, p.amount - p.paidAmount);
      const paidAt = p.paidAt
        ? new Date(p.paidAt).toLocaleDateString("de-DE")
        : "";
      return [
        new Date(p.month).toLocaleDateString("de-DE", {
          month: "2-digit",
          year: "numeric",
        }),
        (p.amount / 100).toFixed(2).replace(".", ","),
        (p.paidAmount / 100).toFixed(2).replace(".", ","),
        (open / 100).toFixed(2).replace(".", ","),
        p.status,
        paidAt,
        mahnungLabel(p),
        p.failureReason ?? "",
      ].join(";");
    });
    const csv = "\uFEFF" + [header, ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rent_${tenant.lastName.toLowerCase()}_${tenant.firstName.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function toggleChargePaid(chargeId: string, paid: boolean) {
    const msg = paid
      ? "Diese Forderung manuell als beglichen markieren? Verwende das nur, wenn der Betrag anders schon verrechnet wurde (z.B. Banküberweisung, bar)."
      : "Diese Forderung wieder als offen markieren? Damit landet sie wieder im nächsten Einzug oder der Kautionsauszahlung.";
    if (!confirm(msg)) return;
    const res = await fetch(
      `/api/admin/tenants/${tenant.id}/extra-charges/${chargeId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid }),
      }
    );
    if (res.ok) router.refresh();
  }

  async function deleteCharge(chargeId: string) {
    if (!confirm("Delete this charge?")) return;
    const res = await fetch(
      `/api/admin/tenants/${tenant.id}/extra-charges/${chargeId}`,
      { method: "DELETE" }
    );
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <div
        className={`grid grid-cols-1 gap-4 ${rentCredit > 0 ? "md:grid-cols-4" : "md:grid-cols-3"}`}
      >
        <SummaryBox label="Total paid" value={fmtEuro(totalPaid)} />
        <SummaryBox label="Open rent" value={fmtEuro(openRent)} tone={openRent > 0 ? "warn" : "ok"} />
        {rentCredit > 0 && (
          <SummaryBox
            label="Rent credit"
            value={`+${fmtEuro(rentCredit)}`}
            tone="ok"
            sub="Verrechnung b. Endabrechnung"
          />
        )}
        <SummaryBox label="Deposit" value={fmtEuro(tenant.depositAmount)} sub={tenant.depositStatus} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Rent history</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-1 text-xs text-gray hover:text-black"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={() => setShowAdjust(true)}
              className="inline-flex items-center gap-1 text-xs text-gray hover:text-black"
              title="Change rent amount (permanent or for a specific month)"
            >
              <Plus className="w-3.5 h-3.5" /> Change rent
            </button>
          </div>
        </div>
        <div className="overflow-x-auto border border-lightgray rounded-[5px]">
          <table className="w-full text-sm">
            <thead className="bg-background-alt">
              <tr>
                <th className="px-3 py-2 text-left text-xs text-gray uppercase">Month</th>
                <th className="px-3 py-2 text-right text-xs text-gray uppercase">Due</th>
                <th className="px-3 py-2 text-right text-xs text-gray uppercase">Paid</th>
                <th className="px-3 py-2 text-right text-xs text-gray uppercase" title="Open balance; negative = credit">Δ</th>
                <th className="px-3 py-2 text-left text-xs text-gray uppercase">Status</th>
                <th className="px-3 py-2 text-left text-xs text-gray uppercase">Mahnung</th>
                <th className="px-3 py-2 text-right text-xs text-gray uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenant.rentPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray">
                    No rent records yet
                  </td>
                </tr>
              ) : (
                tenant.rentPayments.map((p) => {
                  const delta = p.amount - p.paidAmount;
                  const deltaCls =
                    delta > 0
                      ? "text-red-600"
                      : delta < 0
                        ? "text-green-700 font-medium"
                        : "text-gray";
                  const deltaLabel =
                    delta > 0
                      ? fmtEuro(delta)
                      : delta < 0
                        ? `+${fmtEuro(-delta)}`
                        : "—";
                  const mLabel = mahnungLabel(p);
                  const canRetry =
                    tenant.paymentMethod === "SEPA" &&
                    (p.status === "FAILED" ||
                      p.status === "PENDING" ||
                      p.status === "PARTIAL");
                  const canMarkPaid = p.status !== "PAID";
                  return (
                    <tr key={p.id} className="border-t border-lightgray/50">
                      <td className="px-3 py-2">{fmtMonth(p.month)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {fmtEuro(p.amount)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {fmtEuro(p.paidAmount)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${deltaCls}`}
                        title={
                          delta < 0
                            ? "Rent credit — rolled into deposit settlement at end of stay"
                            : undefined
                        }
                      >
                        {deltaLabel}
                      </td>
                      <td className="px-3 py-2">
                        <PaymentStatusBadge status={p.status} />
                        {p.failureReason && (
                          <div
                            className="text-[10px] text-red-600 mt-0.5 truncate max-w-[180px]"
                            title={p.failureReason}
                          >
                            {p.failureReason}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {mLabel ? (
                          <span
                            className={
                              p.mahnung2SentAt
                                ? "text-red-600 font-semibold"
                                : p.mahnung1SentAt
                                  ? "text-orange-600"
                                  : "text-gray"
                            }
                          >
                            {mLabel}
                          </span>
                        ) : (
                          <span className="text-gray/60">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canMarkPaid && (
                            <button
                              onClick={() => setPayModalRent(p)}
                              className="px-2 py-0.5 rounded-[5px] text-[10px] border border-green-300 text-green-700 hover:bg-green-50"
                            >
                              Mark paid
                            </button>
                          )}
                          {canRetry && (
                            <button
                              onClick={() => retryCharge(p.id)}
                              disabled={busyRent === p.id}
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-[5px] text-[10px] border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                            >
                              <RefreshCw className="w-2.5 h-2.5" />
                              {busyRent === p.id ? "…" : "Retry"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {tenant.rentPayments.length > 0 && (
              <tfoot>
                <tr className="border-t border-lightgray bg-background-alt font-semibold">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmtEuro(
                      tenant.rentPayments.reduce((s, p) => s + p.amount, 0)
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-green-700">
                    {fmtEuro(
                      tenant.rentPayments.reduce(
                        (s, p) => s + p.paidAmount,
                        0
                      )
                    )}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      openRent > 0 ? "text-red-600" : "text-gray"
                    }`}
                  >
                    {openRent > 0 ? fmtEuro(openRent) : "—"}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Adjustments</h3>
          <button
            onClick={() => setShowCharge(true)}
            className="inline-flex items-center gap-1 text-xs text-gray hover:text-black"
          >
            <Plus className="w-3.5 h-3.5" /> Add adjustment
          </button>
        </div>
        {tenant.extraCharges.length === 0 ? (
          <p className="text-sm text-gray">None.</p>
        ) : (
          <div className="overflow-x-auto border border-lightgray rounded-[5px]">
            <table className="w-full text-sm">
              <thead className="bg-background-alt">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-gray uppercase">Date</th>
                  <th className="px-3 py-2 text-left text-xs text-gray uppercase">Type</th>
                  <th className="px-3 py-2 text-left text-xs text-gray uppercase">Description</th>
                  <th className="px-3 py-2 text-left text-xs text-gray uppercase">When</th>
                  <th className="px-3 py-2 text-right text-xs text-gray uppercase">Amount</th>
                  <th className="px-3 py-2 text-left text-xs text-gray uppercase">Status</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {tenant.extraCharges.map((c) => {
                  const isDiscount = c.type === "DISCOUNT";
                  return (
                    <tr key={c.id} className="border-t border-lightgray/50">
                      <td className="px-3 py-2">{fmtDate(c.createdAt)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-[5px] text-xs font-semibold ${
                            isDiscount
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {isDiscount ? "Discount" : "Charge"}
                        </span>
                      </td>
                      <td className="px-3 py-2">{c.description}</td>
                      <td className="px-3 py-2 text-xs text-gray">
                        {c.chargeOn === "NEXT_RENT" ? "Next rent" : "At move-out"}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums ${
                          isDiscount ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {isDiscount ? "+" : "−"}
                        {fmtEuro(c.amount)}
                      </td>
                      <td className="px-3 py-2">
                        {c.stripePaymentIntentId ? (
                          <span
                            className="inline-block px-2 py-0.5 rounded-[5px] text-xs font-semibold bg-green-100 text-green-700"
                            title={`Mit Miete verrechnet via Stripe (PI ${c.stripePaymentIntentId.slice(-8)}) — nicht manuell änderbar`}
                          >
                            Mit Miete ✓
                          </span>
                        ) : (
                          <button
                            onClick={() => toggleChargePaid(c.id, !c.paidAt)}
                            className={`inline-block px-2 py-0.5 rounded-[5px] text-xs font-semibold ${c.paidAt ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"} hover:opacity-80`}
                            title={c.paidAt ? "Wieder als offen markieren" : "Manuell als beglichen markieren"}
                          >
                            {c.paidAt ? "Settled" : "Open"}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => deleteCharge(c.id)}
                          className="text-gray hover:text-red-500"
                          aria-label="Delete adjustment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {tenant.rentAdjustments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Rent adjustments</h3>
          <div className="space-y-2">
            {tenant.rentAdjustments.map((a) => (
              <div
                key={a.id}
                className="border border-lightgray rounded-[5px] p-3 text-sm"
              >
                <div className="font-medium">
                  {fmtEuro(a.originalAmount)} → {fmtEuro(a.adjustedAmount)}
                  {a.isPermanent ? " (permanent)" : a.month ? ` (${fmtMonth(a.month)})` : ""}
                </div>
                <div className="text-xs text-gray mt-0.5">{a.reason}</div>
                <div className="text-xs text-gray mt-0.5">
                  Created {fmtDate(a.createdAt)}
                  {a.validFrom && ` · valid from ${fmtDate(a.validFrom)}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCharge && (
        <ExtraChargeModal
          tenantId={tenant.id}
          onClose={() => setShowCharge(false)}
          onSaved={() => {
            setShowCharge(false);
            router.refresh();
          }}
        />
      )}
      {showAdjust && (
        <RentAdjustmentModal
          tenantId={tenant.id}
          currentRent={tenant.monthlyRent}
          onClose={() => setShowAdjust(false)}
          onSaved={() => {
            setShowAdjust(false);
            router.refresh();
          }}
        />
      )}
      {payModalRent && (
        <MarkRentPaidModal
          rentPayment={payModalRent}
          tenantName={`${tenant.firstName} ${tenant.lastName}`}
          onClose={() => setPayModalRent(null)}
          onSaved={() => {
            setPayModalRent(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// ─── Tab 4: Deposit & defects ──────────────────────────────

function DepositTab({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [showDefect, setShowDefect] = useState(false);
  const [iban, setIban] = useState(tenant.depositRefundIban ?? "");
  const [working, setWorking] = useState(false);

  const totalDefects = tenant.defects.reduce(
    (s, d) => s + d.deductionAmount,
    0
  );
  // Split arrears (positive deltas) from credit (negative deltas).
  const openRent = tenant.rentPayments.reduce(
    (s, p) => s + Math.max(0, p.amount - p.paidAmount),
    0
  );
  const rentCredit = tenant.rentPayments.reduce(
    (s, p) => s + Math.max(0, p.paidAmount - p.amount),
    0
  );
  // Only DEPOSIT_SETTLEMENT adjustments land in the deposit refund math.
  // NEXT_RENT items flow through the monthly SEPA instead. Charges count
  // as debt (subtracted), Discounts count as credit (added).
  const openCharges = tenant.extraCharges
    .filter((c) => !c.paidAt && c.type === "CHARGE" && c.chargeOn === "DEPOSIT_SETTLEMENT")
    .reduce((s, c) => s + c.amount, 0);
  const openDiscounts = tenant.extraCharges
    .filter((c) => !c.paidAt && c.type === "DISCOUNT" && c.chargeOn === "DEPOSIT_SETTLEMENT")
    .reduce((s, c) => s + c.amount, 0);
  const settlement =
    (tenant.depositAmount ?? 0) +
    rentCredit +
    openDiscounts -
    totalDefects -
    openRent -
    openCharges;

  async function deleteDefect(defectId: string) {
    if (!confirm("Delete this defect entry?")) return;
    const res = await fetch(
      `/api/admin/tenants/${tenant.id}/defects/${defectId}`,
      { method: "DELETE" }
    );
    if (res.ok) router.refresh();
  }

  async function depositAction(
    action: "set_iban" | "calculate_refund" | "send_settlement" | "mark_transferred",
    extra: Record<string, unknown> = {}
  ) {
    setWorking(true);
    try {
      const res = await fetch("/api/admin/deposits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenant.id, action, ...extra }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? "Action failed");
      } else {
        router.refresh();
      }
    } finally {
      setWorking(false);
    }
  }

  // Settlement deadline (6 weeks after moveOut, per product policy)
  const now = new Date();
  const moveOutDate = tenant.moveOut ? new Date(tenant.moveOut) : null;
  const daysSinceMoveOut =
    moveOutDate && moveOutDate < now
      ? Math.floor((now.getTime() - moveOutDate.getTime()) / 86_400_000)
      : null;
  const deadlineDays = daysSinceMoveOut !== null ? 42 - daysSinceMoveOut : null;
  const deadlineOverdue =
    deadlineDays !== null &&
    deadlineDays < 0 &&
    tenant.depositStatus === "RECEIVED";
  const deadlineUrgent =
    deadlineDays !== null &&
    deadlineDays >= 0 &&
    deadlineDays <= 14 &&
    tenant.depositStatus === "RECEIVED";

  const readyToSend = Boolean(iban.trim()) && settlement >= 0 && tenant.depositStatus === "RECEIVED";
  const readyToMarkTransferred =
    tenant.depositStatus === "RECEIVED" &&
    Boolean(tenant.depositRefundIban) &&
    tenant.depositRefundAmount !== null;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Deadline banner */}
      {moveOutDate && tenant.depositStatus === "RECEIVED" && deadlineDays !== null && (
        <div
          className={`rounded-[5px] p-3 border ${
            deadlineOverdue
              ? "bg-red-50 border-red-200"
              : deadlineUrgent
                ? "bg-orange-50 border-orange-200"
                : "bg-background-alt border-lightgray"
          }`}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div
                className={`text-sm font-semibold ${
                  deadlineOverdue
                    ? "text-red-800"
                    : deadlineUrgent
                      ? "text-orange-800"
                      : "text-black"
                }`}
              >
                {deadlineOverdue
                  ? `Kautionsrückzahlung überfällig — ${-deadlineDays!} Tag(e) über Deadline`
                  : deadlineDays! === 0
                    ? "Letzter Tag: Kaution heute auszahlen"
                    : `${deadlineDays} Tag(e) bis Deadline`}
              </div>
              <div className="text-xs text-gray mt-0.5">
                Move-out war {fmtDate(tenant.moveOut)} · unsere 6-Wochen-Frist
                {daysSinceMoveOut !== null && ` · ${daysSinceMoveOut}d vergangen`}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <SummaryBox label="Deposit" value={fmtEuro(tenant.depositAmount)} sub={tenant.depositStatus} />
        {rentCredit > 0 && (
          <SummaryBox
            label="Rent credit"
            value={`+${fmtEuro(rentCredit)}`}
            tone="ok"
          />
        )}
        {openDiscounts > 0 && (
          <SummaryBox
            label="Discounts"
            value={`+${fmtEuro(openDiscounts)}`}
            tone="ok"
          />
        )}
        <SummaryBox label="Defects" value={`-${fmtEuro(totalDefects)}`} />
        <SummaryBox
          label="Open rent + charges"
          value={`-${fmtEuro(openRent + openCharges)}`}
        />
        <SummaryBox
          label="Settlement"
          value={fmtEuro(settlement)}
          tone={settlement >= 0 ? "ok" : "warn"}
          sub={settlement >= 0 ? "Refund to tenant" : "Outstanding claim"}
        />
      </div>

      {/* Settlement actions — inline, no need to hop to /admin/deposits */}
      {moveOutDate &&
        moveOutDate < now &&
        tenant.depositStatus === "RECEIVED" && (
          <div className="bg-white rounded-[5px] border border-lightgray p-4">
            <div className="text-[10px] uppercase tracking-wide text-gray font-semibold mb-3">
              Settlement actions
            </div>
            <div className="space-y-3">
              {/* IBAN input */}
              <div>
                <label className="block text-xs text-gray mb-1">
                  Refund IBAN
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder="DE89 …"
                    className="flex-1 px-3 py-2 border border-lightgray rounded-[5px] text-sm"
                  />
                  <button
                    onClick={() =>
                      depositAction("set_iban", { iban: iban.trim() })
                    }
                    disabled={working || !iban.trim()}
                    className="px-3 py-2 rounded-[5px] text-xs font-medium border border-lightgray hover:bg-background-alt disabled:opacity-50"
                  >
                    Save IBAN
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => depositAction("calculate_refund")}
                  disabled={working}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-[5px] text-xs font-medium border border-lightgray hover:bg-background-alt disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3" /> Recalculate refund
                </button>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `Send settlement email to ${tenant.email}? Refund amount: ${fmtEuro(tenant.depositRefundAmount ?? settlement)}`
                      )
                    )
                      depositAction("send_settlement");
                  }}
                  disabled={working || !readyToSend}
                  title={!readyToSend ? "Set IBAN first and ensure settlement ≥ €0" : ""}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-[5px] text-xs font-medium border border-lightgray hover:bg-background-alt disabled:opacity-50"
                >
                  <Send className="w-3 h-3" /> Send settlement email
                </button>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        `Mark deposit as transferred?\n\nSets depositStatus = RETURNED and records today's date.`
                      )
                    )
                      depositAction("mark_transferred");
                  }}
                  disabled={working || !readyToMarkTransferred}
                  title={!readyToMarkTransferred ? "Set IBAN + calculate refund first" : ""}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-[5px] text-xs font-medium bg-black text-white hover:bg-black/90 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3 h-3" /> Mark transferred
                </button>
              </div>

              {/* Ready indicator */}
              <div className="flex items-center gap-2 text-xs text-gray">
                {readyToMarkTransferred ? (
                  <span className="inline-flex items-center gap-1 text-green-700">
                    <CheckCircle2 className="w-3 h-3" /> Ready to transfer
                  </span>
                ) : (
                  <span>
                    Still needed:{" "}
                    {[
                      !iban.trim() && "IBAN",
                      tenant.depositRefundAmount === null && "refund calculation",
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Defects</h3>
          <button
            onClick={() => setShowDefect(true)}
            className="inline-flex items-center gap-1 text-xs text-gray hover:text-black"
          >
            <Plus className="w-3.5 h-3.5" /> Add defect
          </button>
        </div>
        {tenant.defects.length === 0 ? (
          <p className="text-sm text-gray">None logged yet.</p>
        ) : (
          <div className="space-y-2">
            {tenant.defects.map((d) => (
              <div
                key={d.id}
                className="border border-lightgray rounded-[5px] p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">{d.description}</div>
                    <div className="text-xs text-gray mt-0.5">
                      {fmtDate(d.createdAt)}
                      {d.photos.length > 0 && ` · ${d.photos.length} photo${d.photos.length === 1 ? "" : "s"}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="tabular-nums text-red-600 font-medium">
                      -{fmtEuro(d.deductionAmount)}
                    </div>
                    <button
                      onClick={() => deleteDefect(d.id)}
                      className="text-gray hover:text-red-500"
                      aria-label="Delete defect"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {tenant.depositReturnedAt && (
        <div className="bg-background-alt rounded-[5px] p-3 text-sm">
          <div className="font-medium">Deposit returned</div>
          <div className="text-xs text-gray mt-0.5">
            {fmtDate(tenant.depositReturnedAt)}
            {tenant.depositRefundAmount !== null &&
              ` · ${fmtEuro(tenant.depositRefundAmount)}`}
            {tenant.depositRefundIban && ` · ${tenant.depositRefundIban}`}
          </div>
        </div>
      )}

      {showDefect && (
        <DefectModal
          tenantId={tenant.id}
          onClose={() => setShowDefect(false)}
          onSaved={() => {
            setShowDefect(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// ─── Tab 5: Timeline ───────────────────────────────────────

type TimelineCategory = "Lease" | "Payment" | "Communication" | "Admin" | "Note";

function TimelineTab({
  tenant,
  auditEvents,
}: {
  tenant: Tenant;
  auditEvents: AuditEvent[];
}) {
  const router = useRouter();
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<TimelineCategory | "">(
    ""
  );

  async function addNote() {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteText.trim() }),
      });
      if (res.ok) {
        setNoteText("");
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(noteId: string) {
    if (!confirm("Delete this note?")) return;
    const res = await fetch(`/api/admin/tenants/${tenant.id}/notes/${noteId}`, {
      method: "DELETE",
    });
    if (res.ok) router.refresh();
  }

  type Event = {
    at: string;
    category: TimelineCategory;
    label: string;
    detail?: string;
    noteId?: string;
    note?: Note;
  };
  const events: Event[] = [];

  // ── Lease events ──
  events.push({ at: tenant.moveIn, category: "Lease", label: "Move-in" });
  if (tenant.moveOut)
    events.push({ at: tenant.moveOut, category: "Lease", label: "Move-out planned" });
  if (tenant.notice)
    events.push({ at: tenant.notice, category: "Lease", label: "Notice given" });
  if (tenant.depositReturnedAt)
    events.push({
      at: tenant.depositReturnedAt,
      category: "Lease",
      label: "Deposit returned",
    });

  // ── Payment events ──
  if (tenant.booking?.bookingFeePaidAt)
    events.push({
      at: tenant.booking.bookingFeePaidAt,
      category: "Payment",
      label: "Booking fee paid",
    });
  if (tenant.booking?.depositPaidAt)
    events.push({
      at: tenant.booking.depositPaidAt,
      category: "Payment",
      label: "Deposit paid",
    });
  tenant.rentPayments.forEach((p) => {
    if (p.paidAt)
      events.push({
        at: p.paidAt,
        category: "Payment",
        label: "Rent paid",
        detail: `${fmtMonth(p.month)} · ${fmtEuro(p.paidAmount)}`,
      });
    if (p.failureReason)
      events.push({
        at: p.month,
        category: "Payment",
        label: "Rent charge failed",
        detail: `${fmtMonth(p.month)} · ${p.failureReason}`,
      });
    if (p.mahnung1SentAt)
      events.push({
        at: p.mahnung1SentAt,
        category: "Communication",
        label: "Mahnung 1 sent",
        detail: fmtMonth(p.month),
      });
    if (p.mahnung2SentAt)
      events.push({
        at: p.mahnung2SentAt,
        category: "Communication",
        label: "Mahnung 2 sent",
        detail: fmtMonth(p.month),
      });
  });

  // ── Communication events ──
  if (tenant.welcomeEmailSentAt)
    events.push({
      at: tenant.welcomeEmailSentAt,
      category: "Communication",
      label: "Welcome email sent",
    });
  if (tenant.paymentFinalWarningSentAt)
    events.push({
      at: tenant.paymentFinalWarningSentAt,
      category: "Communication",
      label: "Payment final warning sent",
    });
  if (tenant.postStayFeedbackSentAt)
    events.push({
      at: tenant.postStayFeedbackSentAt,
      category: "Communication",
      label: "Post-stay feedback sent",
    });
  // Manual communication log entries
  tenant.communications.forEach((c) => {
    const typeLabel = c.type[0] + c.type.slice(1).toLowerCase().replace(/_/g, " ");
    const dirLabel = c.direction === "IN" ? "←" : "→";
    events.push({
      at: c.at,
      category: "Communication",
      label: `${typeLabel} ${dirLabel}`,
      detail: c.summary,
    });
  });

  // ── Admin / system events from audit log ──
  auditEvents.forEach((a) => {
    // Skip if summary missing (useless for timeline display)
    if (!a.summary) return;
    events.push({
      at: a.at,
      category: "Admin",
      label: a.action.replace(/_/g, " "),
      detail: a.summary,
    });
  });

  // ── Notes ──
  tenant.notes.forEach((n) => {
    events.push({
      at: n.createdAt,
      category: "Note",
      label: "Note",
      detail: n.content,
      noteId: n.id,
      note: n,
    });
  });

  const filteredEvents = categoryFilter
    ? events.filter((e) => e.category === categoryFilter)
    : events;
  filteredEvents.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );

  const counts: Record<TimelineCategory, number> = {
    Lease: 0,
    Payment: 0,
    Communication: 0,
    Admin: 0,
    Note: 0,
  };
  events.forEach((e) => {
    counts[e.category]++;
  });

  // Sticky notes pinned at top
  const stickyNotes = tenant.notes.filter((n) => n.sticky);

  return (
    <div className="space-y-6">
      {/* Add-note box */}
      <div className="border border-lightgray rounded-[5px] p-3">
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add a note…"
          rows={2}
          className="w-full text-sm resize-none focus:outline-none"
        />
        <div className="flex justify-end">
          <button
            onClick={addNote}
            disabled={saving || !noteText.trim()}
            className="px-3 py-1.5 bg-black text-white rounded-[5px] text-xs font-medium hover:bg-black/90 disabled:opacity-50"
          >
            {saving ? "…" : "Add note"}
          </button>
        </div>
      </div>

      {/* Sticky notes pinned */}
      {stickyNotes.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-gray font-semibold mb-2">
            Pinned
          </div>
          <div className="space-y-2">
            {stickyNotes.map((n) => (
              <StickyNoteCard
                key={n.id}
                note={n}
                tenantId={tenant.id}
                onChanged={() => router.refresh()}
              />
            ))}
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex items-center gap-1 flex-wrap">
        <FilterChip
          active={categoryFilter === ""}
          onClick={() => setCategoryFilter("")}
          count={events.length}
        >
          All
        </FilterChip>
        {(["Lease", "Payment", "Communication", "Admin", "Note"] as const).map(
          (c) => (
            <FilterChip
              key={c}
              active={categoryFilter === c}
              onClick={() => setCategoryFilter(c)}
              count={counts[c]}
              category={c}
            >
              {c}
            </FilterChip>
          )
        )}
      </div>

      {filteredEvents.length === 0 ? (
        <p className="text-sm text-gray">No events.</p>
      ) : (
        <div className="space-y-2">
          {filteredEvents.map((e, i) => {
            const color = categoryColor(e.category);
            if (e.category === "Note" && e.note) {
              return (
                <NoteBubble
                  key={`note-${e.note.id}`}
                  note={e.note}
                  tenantId={tenant.id}
                  onChanged={() => router.refresh()}
                  onDelete={() => deleteNote(e.note!.id)}
                />
              );
            }
            return (
              <div key={i} className="flex gap-3 text-sm items-start">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${color.dot}`}
                />
                <div className="text-xs text-gray w-20 flex-shrink-0 tabular-nums pt-0.5">
                  {fmtDate(e.at)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block px-1.5 py-0 rounded-[3px] text-[9px] font-semibold uppercase ${color.chip}`}
                    >
                      {e.category}
                    </span>
                    <span className="font-medium text-black">{e.label}</span>
                  </div>
                  {e.detail && (
                    <div className="text-xs text-gray mt-0.5">{e.detail}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function categoryColor(c: TimelineCategory): { dot: string; chip: string } {
  switch (c) {
    case "Lease":
      return { dot: "bg-green-500", chip: "bg-green-100 text-green-700" };
    case "Payment":
      return { dot: "bg-blue-500", chip: "bg-blue-100 text-blue-700" };
    case "Communication":
      return { dot: "bg-purple-500", chip: "bg-purple-100 text-purple-700" };
    case "Admin":
      return { dot: "bg-orange-500", chip: "bg-orange-100 text-orange-700" };
    case "Note":
      return { dot: "bg-pink", chip: "bg-pink/20 text-black" };
  }
}

function FilterChip({
  active,
  onClick,
  count,
  category,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  category?: TimelineCategory;
  children: React.ReactNode;
}) {
  const color = category ? categoryColor(category) : null;
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-[5px] text-xs font-medium ${
        active
          ? "bg-black text-white"
          : "bg-background-alt text-gray hover:text-black"
      }`}
    >
      {color && <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />}
      {children}
      <span
        className={`text-[10px] ${active ? "text-white/70" : "text-gray/60"}`}
      >
        {count}
      </span>
    </button>
  );
}

function NoteBubble({
  note,
  tenantId,
  onChanged,
  onDelete,
}: {
  note: Note;
  tenantId: string;
  onChanged: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState((note.tags ?? []).join(", "));
  const [followUpAt, setFollowUpAt] = useState(
    note.followUpAt ? note.followUpAt.slice(0, 10) : ""
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/admin/tenants/${tenantId}/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          followUpAt: followUpAt || null,
        }),
      });
      setEditing(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function toggleSticky() {
    await fetch(`/api/admin/tenants/${tenantId}/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sticky: !note.sticky }),
    });
    onChanged();
  }

  const followUpDue =
    note.followUpAt && new Date(note.followUpAt) <= new Date();

  return (
    <div className="flex gap-3 text-sm items-start group">
      <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 bg-pink" />
      <div className="text-xs text-gray w-20 flex-shrink-0 tabular-nums pt-0.5">
        {fmtDate(note.createdAt)}
      </div>
      <div className="flex-1 bg-pink/5 border border-pink/20 rounded-[5px] p-3">
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={2}
              className="w-full text-sm bg-white border border-lightgray rounded-[5px] p-2 resize-none"
            />
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags (comma-separated)"
              className="w-full text-xs bg-white border border-lightgray rounded-[5px] p-1.5"
            />
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray">Follow up:</span>
              <input
                type="date"
                value={followUpAt}
                onChange={(e) => setFollowUpAt(e.target.value)}
                className="bg-white border border-lightgray rounded-[5px] p-1"
              />
              {followUpAt && (
                <button
                  onClick={() => setFollowUpAt("")}
                  className="text-gray hover:text-black"
                >
                  clear
                </button>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={save}
                disabled={saving}
                className="px-2 py-1 bg-black text-white rounded-[5px] text-xs disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-2 py-1 border border-lightgray rounded-[5px] text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-sm whitespace-pre-wrap">{note.content}</div>
            {(note.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {note.tags.map((t, i) => (
                  <span
                    key={i}
                    className="inline-block px-1.5 py-0 rounded-[3px] text-[10px] bg-white text-gray border border-lightgray"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
            {note.followUpAt && (
              <div
                className={`text-xs mt-1.5 ${
                  followUpDue ? "text-red-600 font-semibold" : "text-gray"
                }`}
              >
                🔔 Follow-up{" "}
                {new Date(note.followUpAt).toLocaleDateString("de-DE")}
                {followUpDue && " — due"}
              </div>
            )}
            <div className="flex items-center gap-2 mt-2 text-[10px] text-gray opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditing(true)}
                className="hover:text-black"
              >
                Edit
              </button>
              <button
                onClick={toggleSticky}
                className="hover:text-black"
              >
                {note.sticky ? "Unpin" : "Pin"}
              </button>
              <button onClick={onDelete} className="hover:text-red-600">
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StickyNoteCard({
  note,
  tenantId,
  onChanged,
}: {
  note: Note;
  tenantId: string;
  onChanged: () => void;
}) {
  async function unpin() {
    await fetch(`/api/admin/tenants/${tenantId}/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sticky: false }),
    });
    onChanged();
  }
  return (
    <div className="bg-yellow-50 border-l-4 border-l-yellow-400 border border-yellow-200 rounded-[5px] p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="whitespace-pre-wrap">{note.content}</div>
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {note.tags.map((t, i) => (
                <span
                  key={i}
                  className="inline-block px-1.5 py-0 rounded-[3px] text-[10px] bg-white text-gray border border-yellow-200"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={unpin}
          className="text-xs text-gray hover:text-black"
        >
          Unpin
        </button>
      </div>
    </div>
  );
}

// ─── Tab 6: Documents ──────────────────────────────────────

function DocumentsTab({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [showUpload, setShowUpload] = useState(false);

  async function deleteDoc(docId: string) {
    if (!confirm("Delete this document reference? (File stays in Google Drive.)"))
      return;
    const res = await fetch(
      `/api/admin/tenants/${tenant.id}/documents/${docId}`,
      { method: "DELETE" }
    );
    if (res.ok) router.refresh();
  }

  // Group uploaded documents by category
  const docsByCategory = new Map<string, TenantDocument[]>();
  for (const d of tenant.documents) {
    const arr = docsByCategory.get(d.category) ?? [];
    arr.push(d);
    docsByCategory.set(d.category, arr);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Generated / system documents */}
      <div>
        <div className="text-[10px] uppercase tracking-wide text-gray font-semibold mb-2">
          System documents
        </div>
        <div className="space-y-2">
          <DocRow
            label="Lease (Mietvertrag)"
            available={Boolean(tenant.booking?.signatureDocumentId)}
            detail={
              tenant.booking?.signatureDocumentId
                ? "Signed via Yousign — archived to Google Drive"
                : "Not signed yet"
            }
          />
          <DocRow
            label="Payment method (SEPA mandate)"
            available={Boolean(tenant.sepaMandateId)}
            detail={tenant.sepaMandateId ? tenant.sepaMandateId : "Not set up"}
          />
          <DocRow
            label="Wohnungsgeberbestätigung"
            available
            detail="Generated on demand (§19 BMG)"
            action={
              <a
                href={`/api/admin/tenants/${tenant.id}/certificate?type=residence_confirmation`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 bg-black text-white rounded-[5px] text-xs font-medium hover:bg-black/90"
              >
                <Download className="w-3 h-3" /> PDF
              </a>
            }
          />
          <DocRow
            label="Mietschuldenfreiheitsbescheinigung"
            available
            detail="Based on current rent status"
            action={
              <a
                href={`/api/admin/tenants/${tenant.id}/certificate?type=rent_clearance`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 bg-black text-white rounded-[5px] text-xs font-medium hover:bg-black/90"
              >
                <Download className="w-3 h-3" /> PDF
              </a>
            }
          />
        </div>
      </div>

      {/* Uploaded documents */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-wide text-gray font-semibold">
            Uploaded documents ({tenant.documents.length})
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-lightgray rounded-[5px] hover:bg-background-alt"
          >
            <Upload className="w-3.5 h-3.5" /> Add document
          </button>
        </div>
        {tenant.documents.length === 0 ? (
          <p className="text-xs text-gray bg-background-alt border border-lightgray rounded-[5px] p-3">
            No uploaded documents. Add move-in protocols, ID copies, complaint
            letters, handyman receipts etc. Files live in Google Drive; this
            just indexes them.
          </p>
        ) : (
          <div className="space-y-4">
            {(
              [
                "CONTRACT",
                "COMPLIANCE",
                "FINANCIAL",
                "CORRESPONDENCE",
                "OTHER",
              ] as const
            ).map((cat) => {
              const docs = docsByCategory.get(cat) ?? [];
              if (docs.length === 0) return null;
              return (
                <div key={cat}>
                  <div className="text-[10px] text-gray uppercase tracking-wide mb-1.5">
                    {categoryLabel(cat)}
                  </div>
                  <div className="space-y-1">
                    {docs.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between gap-2 bg-background-alt border border-lightgray rounded-[5px] p-2 text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-gray flex-shrink-0" />
                          <div className="min-w-0">
                            <a
                              href={d.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium hover:underline truncate inline-flex items-center gap-1"
                            >
                              {d.filename}{" "}
                              <ExternalLink className="w-3 h-3 text-gray" />
                            </a>
                            {d.description && (
                              <div className="text-xs text-gray truncate">
                                {d.description}
                              </div>
                            )}
                            <div className="text-[10px] text-gray">
                              Uploaded {fmtDate(d.uploadedAt)}
                              {d.uploadedBy && ` · by ${d.uploadedBy}`}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteDoc(d.id)}
                          className="text-gray hover:text-red-500"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showUpload && (
        <DocumentUploadModal
          tenantId={tenant.id}
          onClose={() => setShowUpload(false)}
          onSaved={() => {
            setShowUpload(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function categoryLabel(c: string): string {
  switch (c) {
    case "CONTRACT":
      return "Contracts";
    case "COMPLIANCE":
      return "Compliance";
    case "FINANCIAL":
      return "Financial";
    case "CORRESPONDENCE":
      return "Correspondence";
    default:
      return "Other";
  }
}

// ─── Modals ────────────────────────────────────────────────

function ExtraChargeModal({
  tenantId,
  onClose,
  onSaved,
}: {
  tenantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<"CHARGE" | "DISCOUNT">("CHARGE");
  const [chargeOn, setChargeOn] = useState<"NEXT_RENT" | "DEPOSIT_SETTLEMENT">(
    "NEXT_RENT"
  );
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const cents = Math.round(parseFloat(amount.replace(",", ".")) * 100);
    if (!description.trim() || !Number.isFinite(cents) || cents <= 0) {
      toast.warn("Fill in description and a positive amount");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/extra-charges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, amount: cents, type, chargeOn }),
      });
      if (res.ok) onSaved();
      else toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  const isDiscount = type === "DISCOUNT";
  return (
    <Modal title="Add adjustment" onClose={onClose}>
      <div className="mb-3">
        <div className="block text-xs text-gray mb-1">Type</div>
        <div className="inline-flex rounded-[5px] border border-lightgray overflow-hidden">
          <button
            type="button"
            onClick={() => setType("CHARGE")}
            className={`px-3 py-1.5 text-sm ${type === "CHARGE" ? "bg-black text-white" : "bg-white text-gray hover:bg-background-alt"}`}
          >
            Charge (Mieter schuldet)
          </button>
          <button
            type="button"
            onClick={() => setType("DISCOUNT")}
            className={`px-3 py-1.5 text-sm ${type === "DISCOUNT" ? "bg-green-700 text-white" : "bg-white text-gray hover:bg-background-alt"}`}
          >
            Discount (Nachlass)
          </button>
        </div>
      </div>
      <FormInput
        label={isDiscount ? "Grund" : "Description"}
        value={description}
        onChange={setDescription}
        placeholder={
          isDiscount
            ? "z.B. Heizungsausfall 3 Tage"
            : "z.B. Schlüsselersatz"
        }
      />
      <FormInput
        label="Amount (€)"
        value={amount}
        onChange={setAmount}
        placeholder="50.00"
        type="number"
      />
      <div className="mb-3">
        <div className="block text-xs text-gray mb-1">When</div>
        <div className="inline-flex rounded-[5px] border border-lightgray overflow-hidden">
          <button
            type="button"
            onClick={() => setChargeOn("NEXT_RENT")}
            className={`px-3 py-1.5 text-sm ${chargeOn === "NEXT_RENT" ? "bg-black text-white" : "bg-white text-gray hover:bg-background-alt"}`}
          >
            Mit nächster Miete
          </button>
          <button
            type="button"
            onClick={() => setChargeOn("DEPOSIT_SETTLEMENT")}
            className={`px-3 py-1.5 text-sm ${chargeOn === "DEPOSIT_SETTLEMENT" ? "bg-black text-white" : "bg-white text-gray hover:bg-background-alt"}`}
          >
            Erst bei Auszug
          </button>
        </div>
      </div>
      <ModalActions onCancel={onClose} onSave={save} saving={saving} />
    </Modal>
  );
}

function RentAdjustmentModal({
  tenantId,
  currentRent,
  onClose,
  onSaved,
}: {
  tenantId: string;
  currentRent: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState((currentRent / 100).toFixed(2));
  const [reason, setReason] = useState("");
  const [isPermanent, setIsPermanent] = useState(false);
  const [month, setMonth] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const cents = Math.round(parseFloat(amount.replace(",", ".")) * 100);
    if (!reason.trim() || !Number.isFinite(cents) || cents <= 0) {
      toast.warn("Fill in reason and a positive amount");
      return;
    }
    if (!isPermanent && !month) {
      toast.warn("Select a month for one-off adjustment");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/rent-adjustment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustedAmount: cents,
          reason,
          isPermanent,
          month: !isPermanent ? month : undefined,
          validFrom: isPermanent ? validFrom || undefined : undefined,
        }),
      });
      if (res.ok) onSaved();
      else toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Adjust rent" onClose={onClose}>
      <div className="text-xs text-gray">
        Current rent: {fmtEuro(currentRent, 2)}
      </div>
      <FormInput
        label="New amount (€)"
        value={amount}
        onChange={setAmount}
        placeholder="950.00"
        type="number"
      />
      <FormInput
        label="Reason"
        value={reason}
        onChange={setReason}
        placeholder="z.B. Preisanpassung, Nebenkosten-Erhöhung"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPermanent}
          onChange={(e) => setIsPermanent(e.target.checked)}
        />
        Permanent change (updates tenant.monthlyRent)
      </label>
      {!isPermanent ? (
        <FormInput
          label="Month (one-off)"
          value={month}
          onChange={setMonth}
          type="month"
        />
      ) : (
        <FormInput
          label="Valid from (optional)"
          value={validFrom}
          onChange={setValidFrom}
          type="date"
        />
      )}
      <ModalActions onCancel={onClose} onSave={save} saving={saving} />
    </Modal>
  );
}

function DefectModal({
  tenantId,
  onClose,
  onSaved,
}: {
  tenantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const cents = Math.round(parseFloat(amount.replace(",", ".")) * 100);
    if (!description.trim() || !Number.isFinite(cents) || cents < 0) {
      toast.warn("Fill in description and amount (can be 0)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/defects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, deductionAmount: cents }),
      });
      if (res.ok) onSaved();
      else toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add defect" onClose={onClose}>
      <FormInput
        label="Description"
        value={description}
        onChange={setDescription}
        placeholder="z.B. Wandfarbe beschädigt"
      />
      <FormInput
        label="Deduction amount (€)"
        value={amount}
        onChange={setAmount}
        placeholder="0"
        type="number"
      />
      <p className="text-xs text-gray">
        Photo upload comes in a future iteration.
      </p>
      <ModalActions onCancel={onClose} onSave={save} saving={saving} />
    </Modal>
  );
}

// ─── Shared components ─────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[5px] border border-lightgray p-6 max-w-md w-full space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="font-bold text-black">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray hover:text-black"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  onSave,
  saving,
}: {
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        onClick={onCancel}
        className="px-3 py-1.5 text-sm border border-lightgray rounded-[5px] hover:bg-background-alt"
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="px-3 py-1.5 text-sm bg-black text-white rounded-[5px] hover:bg-black/90 disabled:opacity-50"
      >
        {saving ? "..." : "Save"}
      </button>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-gray mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm focus:outline-none focus:border-black"
      />
    </label>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <div className="text-xs text-gray mb-0.5">{label}</div>
      <div className="px-3 py-2 bg-background-alt rounded-[5px] border border-lightgray text-black">
        {value}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start text-sm">
      <div className="w-40 text-gray flex-shrink-0">{label}</div>
      <div className="flex-1 text-black">{value}</div>
    </div>
  );
}

function SummaryBox({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ok" | "warn";
}) {
  const valueClass =
    tone === "ok" ? "text-green-700" : tone === "warn" ? "text-orange-600" : "text-black";
  return (
    <div className="bg-background-alt rounded-[5px] border border-lightgray p-3">
      <div className="text-xs text-gray uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-bold mt-1 ${valueClass}`}>{value}</div>
      {sub && <div className="text-xs text-gray mt-1">{sub}</div>}
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const tone =
    status === "PAID"
      ? "bg-green-100 text-green-700"
      : status === "FAILED"
        ? "bg-red-100 text-red-700"
        : status === "PROCESSING"
          ? "bg-blue-100 text-blue-700"
          : status === "PARTIAL"
            ? "bg-orange-100 text-orange-700"
            : "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-[5px] text-xs font-semibold ${tone}`}>
      {status}
    </span>
  );
}

/** Manual email resend dropdown in the folio header. Lists a hard-coded
 *  set of templates for the first MVP. Each calls POST
 *  /api/admin/emails/resend with {templateKey, tenantId}; the server
 *  validates prerequisites (e.g. open rent for mahnungen, IBAN for
 *  deposit-return) and returns a 400 with an explanation when blocked. */
function ResendEmailDropdown({ tenantId }: { tenantId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const templates: { key: string; label: string; description: string }[] = [
    { key: "welcome", label: "Welcome email", description: "nach Move-in" },
    { key: "payment_setup", label: "Payment setup link", description: "Zahlungsmethode einrichten" },
    { key: "rent_reminder", label: "Rent arrears", description: "aktueller Rückstand mit Zahlungslink" },
    { key: "mahnung2", label: "Kündigung", description: "nur bei ≥2 Monaten Rückstand" },
  ];

  async function resend(templateKey: string) {
    if (!confirm(`${templates.find((t) => t.key === templateKey)?.label} an den Mieter senden?`))
      return;
    setBusy(templateKey);
    try {
      const res = await fetch("/api/admin/emails/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey, tenantId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`Email gesendet an ${data.sentTo}`);
        setOpen(false);
      } else {
        toast.error("Fehler", { description: data.error ?? res.statusText });
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] text-xs font-medium border border-lightgray hover:bg-background-alt"
      >
        <Mail className="w-3.5 h-3.5" />
        Resend email
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-64 bg-white border border-lightgray rounded-[5px] shadow-lg z-50">
            <div className="p-2 border-b border-lightgray text-[10px] uppercase tracking-wider text-gray font-semibold">
              Email templates
            </div>
            <div className="divide-y divide-lightgray">
              {templates.map((t) => (
                <button
                  key={t.key}
                  onClick={() => resend(t.key)}
                  disabled={busy !== null}
                  className="w-full text-left px-3 py-2 hover:bg-background-alt disabled:opacity-50"
                >
                  <div className="text-sm font-medium text-black">{t.label}</div>
                  <div className="text-[11px] text-gray">
                    {busy === t.key ? "Sending…" : t.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Room transfer modal — pick a target room in the same location, set
 *  transfer date (past, today, or future), optionally change rent. */
function RoomTransferModal({
  tenantId,
  tenantName,
  currentRoomId,
  currentRoomNumber,
  currentRent,
  locationId,
  onClose,
  onSuccess,
}: {
  tenantId: string;
  tenantName: string;
  currentRoomId: string | null;
  currentRoomNumber: string;
  currentRent: number;
  locationId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [rooms, setRooms] = useState<
    { id: string; roomNumber: string; category: string; monthlyRent: number; occupied: boolean }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [toRoomId, setToRoomId] = useState("");
  const [transferDate, setTransferDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [reason, setReason] = useState("");
  const [changeRent, setChangeRent] = useState(false);
  const [newRent, setNewRent] = useState((currentRent / 100).toFixed(2));
  const [forceOverride, setForceOverride] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<{
    name: string;
  } | null>(null);

  // Load available rooms on mount
  useEffect(() => {
    if (!locationId) return;
    fetch(`/api/admin/rooms?locationId=${locationId}`)
      .then((r) => r.json())
      .then((data) => {
        // Flatten rooms from the location's apartments
        const flat: typeof rooms = [];
        for (const apt of data.apartments ?? []) {
          for (const room of apt.rooms ?? []) {
            if (room.id === currentRoomId) continue;
            flat.push({
              id: room.id,
              roomNumber: room.roomNumber,
              category: room.category,
              monthlyRent: room.monthlyRent,
              occupied: (room.tenants ?? []).length > 0,
            });
          }
        }
        flat.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));
        setRooms(flat);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [locationId, currentRoomId]);

  // When a room is selected, auto-fill the rent if changeRent is on
  useEffect(() => {
    if (changeRent && toRoomId) {
      const target = rooms.find((r) => r.id === toRoomId);
      if (target) setNewRent((target.monthlyRent / 100).toFixed(2));
    }
  }, [toRoomId, changeRent, rooms]);

  async function save() {
    if (!toRoomId) {
      toast.warn("Bitte Zielzimmer auswählen");
      return;
    }
    const rentCents = changeRent
      ? Math.round(parseFloat(newRent.replace(",", ".")) * 100)
      : null;
    setSaving(true);
    setConflict(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toRoomId,
          transferDate,
          reason: reason || null,
          newMonthlyRent: rentCents,
          forceOverride,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const msg = data.executed
          ? "Zimmerwechsel ausgeführt."
          : `Zimmerwechsel geplant für ${transferDate}.`;
        toast.info(msg);
        onSuccess();
      } else if (res.status === 409 && data.occupiedBy) {
        setConflict({ name: data.occupiedBy.name });
      } else {
        toast.error("Fehler", { description: data.error ?? res.statusText });
      }
    } finally {
      setSaving(false);
    }
  }

  const selectedRoom = rooms.find((r) => r.id === toRoomId);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[5px] border border-lightgray p-6 max-w-md w-full space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-black">Zimmerwechsel</h3>
            <p className="text-xs text-gray mt-0.5">
              {tenantName} · aktuell #{currentRoomNumber}
            </p>
          </div>
          <button onClick={onClose} className="text-gray hover:text-black">
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="block">
          <span className="block text-xs text-gray mb-1">Zielzimmer</span>
          {loading ? (
            <p className="text-sm text-gray">Laden…</p>
          ) : (
            <select
              value={toRoomId}
              onChange={(e) => setToRoomId(e.target.value)}
              className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
            >
              <option value="">— Zimmer wählen —</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.roomNumber} · {r.category.replace(/_/g, " ")} · €
                  {(r.monthlyRent / 100).toFixed(0)}
                  {r.occupied ? " ⚠ belegt" : ""}
                </option>
              ))}
            </select>
          )}
        </label>

        <label className="block">
          <span className="block text-xs text-gray mb-1">
            Datum (Vergangenheit, heute oder Zukunft)
          </span>
          <input
            type="date"
            value={transferDate}
            onChange={(e) => setTransferDate(e.target.value)}
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
          />
        </label>

        <label className="block">
          <span className="block text-xs text-gray mb-1">Grund (optional)</span>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="z.B. Upgrade, Renovierung, Beschwerde"
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm"
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={changeRent}
            onChange={(e) => setChangeRent(e.target.checked)}
          />
          <span className="text-sm">Miete anpassen</span>
        </label>

        {changeRent && (
          <label className="block">
            <span className="block text-xs text-gray mb-1">
              Neue Miete (€) — aktuell €{(currentRent / 100).toFixed(0)}
              {selectedRoom &&
                ` · Zimmerpreis €${(selectedRoom.monthlyRent / 100).toFixed(0)}`}
            </span>
            <input
              type="number"
              value={newRent}
              onChange={(e) => setNewRent(e.target.value)}
              className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm"
            />
          </label>
        )}

        {conflict && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-[5px] text-xs text-orange-900">
            <strong>⚠ Zimmer belegt von {conflict.name}</strong>
            <br />
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={forceOverride}
                onChange={(e) => setForceOverride(e.target.checked)}
              />
              <span>Trotzdem zuweisen (Doppelbelegung)</span>
            </label>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm border border-lightgray rounded-[5px] hover:bg-background-alt"
          >
            Abbrechen
          </button>
          <button
            onClick={save}
            disabled={!toRoomId || saving}
            className="px-3 py-1.5 text-sm bg-black text-white rounded-[5px] hover:bg-black/90 disabled:opacity-50"
          >
            {saving ? "..." : "Wechseln"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DocRow({
  label,
  available,
  detail,
  action,
}: {
  label: string;
  available: boolean;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border border-lightgray rounded-[5px] px-3 py-2 text-sm">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-gray mt-0.5">{detail}</div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-[5px] font-semibold ${
            available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {available ? "Available" : "Missing"}
        </span>
        {action}
      </div>
    </div>
  );
}

/* ─── Emails tab ───────────────────────────────────────── */

function EmailsTab({
  sentEmails,
  onChanged,
}: {
  sentEmails: SentEmail[];
  onChanged: () => void;
}) {
  const [resendingId, setResendingId] = useState<string | null>(null);

  const stats = {
    total: sentEmails.length,
    sent: sentEmails.filter((e) => e.status === "sent").length,
    failed: sentEmails.filter((e) => e.status === "failed").length,
  };

  async function resendFromLog(entry: SentEmail) {
    if (!confirm(`Resend "${entry.templateKey}" to ${entry.recipient}?`))
      return;
    setResendingId(entry.id);
    try {
      const res = await fetch(`/api/admin/emails/${entry.id}/resend`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`Resent to ${data.sentTo}`);
        onChanged();
      } else {
        toast.error("Failed", { description: data.error ?? res.statusText });
      }
    } finally {
      setResendingId(null);
    }
  }

  if (sentEmails.length === 0) {
    return (
      <div className="text-center text-sm text-gray py-8">
        No emails logged yet for this tenant.
        <div className="mt-2">
          <Link
            href="/admin/emails"
            className="text-xs underline hover:no-underline"
          >
            Open email hub →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3 text-xs text-gray">
          <span>
            <strong className="text-black">{stats.total}</strong> total
          </span>
          <span>
            <strong className="text-green-700">{stats.sent}</strong> sent
          </span>
          {stats.failed > 0 && (
            <span>
              <strong className="text-red-600">{stats.failed}</strong> failed
            </span>
          )}
        </div>
        <Link
          href="/admin/emails"
          className="text-xs text-gray hover:text-black underline"
        >
          Open email hub →
        </Link>
      </div>

      <div className="border border-lightgray rounded-[5px] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background-alt">
            <tr>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">
                When
              </th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">
                Template
              </th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">
                Trigger
              </th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase">
                Status
              </th>
              <th className="px-3 py-2 text-right text-xs text-gray uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sentEmails.map((e) => {
              const sent = new Date(e.sentAt);
              return (
                <tr
                  key={e.id}
                  className={`border-t border-lightgray/50 ${
                    e.status === "failed" ? "bg-red-50/40" : ""
                  }`}
                >
                  <td className="px-3 py-2 text-xs tabular-nums whitespace-nowrap">
                    {sent.toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                    })}{" "}
                    {sent.toLocaleTimeString("de-DE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-black">
                      {e.subject ?? e.templateKey}
                    </div>
                    <div className="text-[10px] text-gray font-mono">
                      {e.templateKey}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray">
                    {e.triggeredBy.replace(/_/g, " ")}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {e.status === "sent" ? (
                      <span className="text-green-700">✓ Sent</span>
                    ) : e.status === "failed" ? (
                      <span className="text-red-600" title={e.error ?? ""}>
                        ✗ Failed
                      </span>
                    ) : (
                      <span className="text-gray">⊘ Skipped</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => resendFromLog(e)}
                      disabled={resendingId === e.id}
                      className="inline-block px-2 py-0.5 rounded-[5px] text-[10px] font-medium border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                    >
                      {resendingId === e.id ? "…" : "Resend"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sentEmails.length === 50 && (
        <p className="text-[10px] text-gray mt-2">
          Showing 50 most recent. Full history in the{" "}
          <Link href="/admin/emails" className="underline">
            email hub
          </Link>
          .
        </p>
      )}
    </div>
  );
}

/* ─── New folio modals (Note, RecordPayment, Comm, Docs, MarkRent) ── */

function NoteModal({
  tenantId,
  onClose,
  onSaved,
}: {
  tenantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [sticky, setSticky] = useState(false);
  const [followUpAt, setFollowUpAt] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          sticky,
          followUpAt: followUpAt || null,
        }),
      });
      if (res.ok) onSaved();
      else toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add note" onClose={onClose}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        placeholder="What should the team know?"
        className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm resize-none"
        autoFocus
      />
      <div className="mt-3">
        <label className="block text-xs text-gray mb-1">
          Tags (comma-separated — e.g. complaint, follow-up, positive)
        </label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm"
        />
      </div>
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sticky}
            onChange={(e) => setSticky(e.target.checked)}
          />
          Pin to top
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          Follow-up:
          <input
            type="date"
            value={followUpAt}
            onChange={(e) => setFollowUpAt(e.target.value)}
            className="px-2 py-1 border border-lightgray rounded-[5px] text-xs"
          />
          {followUpAt && (
            <button
              onClick={() => setFollowUpAt("")}
              className="text-xs text-gray hover:text-black"
            >
              clear
            </button>
          )}
        </label>
      </div>
      <div className="flex gap-2 mt-4 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-lightgray rounded-[5px] text-sm"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving || !content.trim()}
          className="px-4 py-2 bg-black text-white rounded-[5px] text-sm font-semibold hover:bg-black/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Add note"}
        </button>
      </div>
    </Modal>
  );
}

function RecordPaymentModal({
  tenant,
  onClose,
  onSaved,
}: {
  tenant: Tenant;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  // Open rents first, then paid (for overpayment recording)
  const options = [...tenant.rentPayments].sort((a, b) => {
    const aOpen = a.amount - a.paidAmount > 0 ? 0 : 1;
    const bOpen = b.amount - b.paidAmount > 0 ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    return new Date(b.month).getTime() - new Date(a.month).getTime();
  });
  const [rentId, setRentId] = useState<string>(options[0]?.id ?? "");
  const [amount, setAmount] = useState<string>("");
  const [paidAt, setPaidAt] = useState<string>(today);
  const [saving, setSaving] = useState(false);

  const selected = options.find((r) => r.id === rentId);
  // Auto-fill amount when selection changes — default to remaining open
  useEffect(() => {
    if (selected) {
      const remaining = Math.max(0, selected.amount - selected.paidAmount);
      setAmount((remaining / 100).toFixed(2));
    }
  }, [rentId, selected]);

  async function save() {
    if (!rentId) return;
    const cents = Math.round(Number(amount.replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      toast.warn("Enter a positive amount");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/rent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rentPaymentId: rentId,
          action: "mark_paid",
          amount: cents,
          paidAt,
        }),
      });
      if (res.ok) onSaved();
      else {
        const data = await res.json().catch(() => ({}));
        toast.error("Save failed", { description: data.error ?? "Unknown error" });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Record payment" onClose={onClose}>
      <p className="text-xs text-gray mb-3">
        Use this for bank transfers, cash, or any payment received outside
        Stripe. Under-payment → Partial status. Over-payment → recorded as
        credit at settlement.
      </p>
      <label className="block mb-3">
        <span className="block text-xs text-gray mb-1">Rent period</span>
        <select
          value={rentId}
          onChange={(e) => setRentId(e.target.value)}
          className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
        >
          {options.length === 0 && <option value="">No rent records</option>}
          {options.map((r) => {
            const open = r.amount - r.paidAmount;
            return (
              <option key={r.id} value={r.id}>
                {fmtMonth(r.month)} · {fmtEuro(r.amount)} · {r.status}
                {open > 0 ? ` · ${fmtEuro(open)} open` : " · paid"}
              </option>
            );
          })}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <label className="block">
          <span className="block text-xs text-gray mb-1">Amount received (€)</span>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm tabular-nums"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-gray mb-1">Paid on</span>
          <input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm"
          />
        </label>
      </div>
      {selected && (
        <div className="text-xs text-gray mb-3">
          {(() => {
            const cents = Math.round(Number(amount.replace(",", ".")) * 100);
            if (!Number.isFinite(cents) || cents <= 0) return null;
            const remaining = Math.max(0, selected.amount - selected.paidAmount);
            if (cents < remaining)
              return `Under by ${fmtEuro(remaining - cents)} → status becomes PARTIAL`;
            if (cents > remaining)
              return `Over by ${fmtEuro(cents - remaining)} — recorded as credit at settlement`;
            return "Full amount — status becomes PAID";
          })()}
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-lightgray rounded-[5px] text-sm"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving || !rentId || !amount}
          className="px-4 py-2 bg-black text-white rounded-[5px] text-sm font-semibold hover:bg-black/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Record payment"}
        </button>
      </div>
    </Modal>
  );
}

function CommunicationModal({
  tenantId,
  onClose,
  onSaved,
}: {
  tenantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const nowLocal = new Date();
  const defaultAt =
    nowLocal.toISOString().slice(0, 10) +
    "T" +
    nowLocal.toTimeString().slice(0, 5);
  const [type, setType] = useState<
    "PHONE" | "SMS" | "WHATSAPP" | "IN_PERSON" | "LETTER" | "OTHER"
  >("PHONE");
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [summary, setSummary] = useState("");
  const [at, setAt] = useState(defaultAt);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!summary.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/tenants/${tenantId}/communications`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            direction,
            summary: summary.trim(),
            at: new Date(at).toISOString(),
          }),
        }
      );
      if (res.ok) onSaved();
      else toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Log communication" onClose={onClose}>
      <p className="text-xs text-gray mb-3">
        Record a phone call, SMS, WhatsApp chat, or in-person conversation.
        Appears in the Timeline tab for future reference.
      </p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <label className="block">
          <span className="block text-xs text-gray mb-1">Channel</span>
          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value as typeof type)
            }
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
          >
            <option value="PHONE">Phone call</option>
            <option value="SMS">SMS</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="IN_PERSON">In person</option>
            <option value="LETTER">Letter / mail</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-gray mb-1">Direction</span>
          <div className="inline-flex rounded-[5px] border border-lightgray overflow-hidden w-full">
            <button
              type="button"
              onClick={() => setDirection("IN")}
              className={`flex-1 px-3 py-2 text-sm ${direction === "IN" ? "bg-black text-white" : "bg-white text-gray hover:bg-background-alt"}`}
            >
              ← Incoming
            </button>
            <button
              type="button"
              onClick={() => setDirection("OUT")}
              className={`flex-1 px-3 py-2 text-sm ${direction === "OUT" ? "bg-black text-white" : "bg-white text-gray hover:bg-background-alt"}`}
            >
              → Outgoing
            </button>
          </div>
        </label>
      </div>
      <label className="block mb-3">
        <span className="block text-xs text-gray mb-1">When</span>
        <input
          type="datetime-local"
          value={at}
          onChange={(e) => setAt(e.target.value)}
          className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm"
        />
      </label>
      <label className="block mb-3">
        <span className="block text-xs text-gray mb-1">Summary / notes</span>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          placeholder="What was discussed? Any action items?"
          className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm resize-none"
        />
      </label>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-lightgray rounded-[5px] text-sm"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving || !summary.trim()}
          className="px-4 py-2 bg-black text-white rounded-[5px] text-sm font-semibold hover:bg-black/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Log entry"}
        </button>
      </div>
    </Modal>
  );
}

function DocumentUploadModal({
  tenantId,
  onClose,
  onSaved,
}: {
  tenantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [filename, setFilename] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<
    "CONTRACT" | "COMPLIANCE" | "FINANCIAL" | "CORRESPONDENCE" | "OTHER"
  >("OTHER");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!filename.trim() || !url.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: filename.trim(),
          url: url.trim(),
          category,
          description: description.trim() || null,
        }),
      });
      if (res.ok) onSaved();
      else toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add document" onClose={onClose}>
      <p className="text-xs text-gray mb-3">
        Upload the file to{" "}
        <a
          href="https://drive.google.com/drive/folders/"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Google Drive
        </a>{" "}
        first, then paste the shareable link here. Keeps files out of our
        DB and under the same access control as the rest of our docs.
      </p>
      <div className="space-y-3">
        <label className="block">
          <span className="block text-xs text-gray mb-1">Filename</span>
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="e.g. move_in_protocol_2026.pdf"
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-gray mb-1">Google Drive URL</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://drive.google.com/…"
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-gray mb-1">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
          >
            <option value="CONTRACT">Contract</option>
            <option value="COMPLIANCE">Compliance (Meldeschein, Ausweis…)</option>
            <option value="FINANCIAL">Financial</option>
            <option value="CORRESPONDENCE">Correspondence</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-xs text-gray mb-1">
            Description (optional)
          </span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Context / what this is"
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm"
          />
        </label>
      </div>
      <div className="flex gap-2 mt-4 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-lightgray rounded-[5px] text-sm"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving || !filename.trim() || !url.trim()}
          className="px-4 py-2 bg-black text-white rounded-[5px] text-sm font-semibold hover:bg-black/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Add"}
        </button>
      </div>
    </Modal>
  );
}

function MarkRentPaidModal({
  rentPayment,
  tenantName,
  onClose,
  onSaved,
}: {
  rentPayment: RentPayment;
  tenantName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const remaining = Math.max(0, rentPayment.amount - rentPayment.paidAmount);
  const [amount, setAmount] = useState((remaining / 100).toFixed(2));
  const [paidAt, setPaidAt] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    const cents = Math.round(Number(amount.replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      toast.warn("Enter a positive amount");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/rent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rentPaymentId: rentPayment.id,
          action: "mark_paid",
          amount: cents,
          paidAt,
        }),
      });
      if (res.ok) onSaved();
      else {
        const data = await res.json().catch(() => ({}));
        toast.error("Save failed", { description: data.error ?? res.statusText });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Mark paid · ${fmtMonth(rentPayment.month)}`} onClose={onClose}>
      <p className="text-xs text-gray mb-3">
        {tenantName} · Due {fmtEuro(rentPayment.amount)} · Paid so far{" "}
        {fmtEuro(rentPayment.paidAmount)}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs text-gray mb-1">Amount (€)</span>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm tabular-nums"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-gray mb-1">Paid on</span>
          <input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm"
          />
        </label>
      </div>
      <div className="flex gap-2 justify-end mt-4">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-lightgray rounded-[5px] text-sm"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-black text-white rounded-[5px] text-sm font-semibold hover:bg-black/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Record"}
        </button>
      </div>
    </Modal>
  );
}
