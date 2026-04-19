"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Info,
  X,
  ChevronDown,
} from "lucide-react";

type SentEmail = {
  id: string;
  templateKey: string;
  recipient: string;
  subject: string | null;
  entityType: string | null;
  entityId: string | null;
  resendId: string | null;
  status: string; // "sent" | "failed" | "skipped"
  error: string | null;
  triggeredBy: string;
  sentAt: string;
  tenantId: string | null;
  tenantName: string | null;
};

type Tenant = { id: string; name: string; email: string };

/* ─── Template catalog ─────────────────────────────────── */

type TemplateGroup = "onboarding" | "payment" | "rent" | "move-out" | "short-stay" | "internal";

type TemplateDef = {
  key: string;
  label: string;
  description: string;
  group: TemplateGroup;
  /** Template is available via the generic Quick Send form (has a
   *  handler in /api/admin/emails/resend). Others are shown in history
   *  but can't be manually triggered (e.g. team internal). */
  canQuickSend?: boolean;
};

const TEMPLATES: TemplateDef[] = [
  // Onboarding
  { key: "welcome", label: "Welcome email", description: "before move-in, Wohnungsgeber attached", group: "onboarding", canQuickSend: true },
  { key: "pre_arrival", label: "Pre-arrival (SHORT)", description: "1 day before arrival, check-in link", group: "short-stay" },
  { key: "short_stay_confirmation", label: "Short-stay confirmation", description: "booking confirmation + payment receipt", group: "short-stay" },
  // Payment & deposit
  { key: "deposit_payment_link", label: "Deposit payment link", description: "after booking fee paid", group: "payment" },
  { key: "deposit_reminder", label: "Deposit reminder", description: "24h before deadline", group: "payment" },
  { key: "deposit_timeout", label: "Deposit timeout", description: "reservation released", group: "payment" },
  { key: "deposit_confirmation", label: "Deposit confirmation + lease", description: "after deposit received", group: "payment" },
  { key: "payment_setup", label: "Payment setup link", description: "set up SEPA/card", group: "payment", canQuickSend: true },
  { key: "payment_setup_confirmation", label: "Payment setup confirmation", description: "method saved successfully", group: "payment" },
  { key: "payment_setup_reminder", label: "Payment setup reminder", description: "nudge to set up SEPA", group: "payment", canQuickSend: true },
  { key: "payment_final_warning", label: "Payment final warning", description: "3d before move-in, still no SEPA", group: "payment" },
  // Rent
  { key: "rent_reminder", label: "Rent reminder", description: "Day 3 — friendly", group: "rent", canQuickSend: true },
  { key: "mahnung1", label: "1. Mahnung", description: "Day 14 — formal", group: "rent", canQuickSend: true },
  { key: "mahnung2", label: "2. Mahnung + Kündigung", description: "Day 30 — last notice", group: "rent", canQuickSend: true },
  // Move-out
  { key: "termination", label: "Termination notice", description: "lease ended — requires reason + date", group: "move-out", canQuickSend: true },
  { key: "deposit_return", label: "Deposit settlement", description: "refund breakdown + IBAN", group: "move-out", canQuickSend: true },
  { key: "post_stay_feedback", label: "Post-stay feedback", description: "after move-out", group: "move-out", canQuickSend: true },
  { key: "checkout_reminder", label: "Checkout reminder (SHORT)", description: "1 day before departure", group: "short-stay" },
  { key: "invoice", label: "Invoice (SHORT)", description: "final invoice PDF", group: "short-stay" },
  // Internal
  { key: "team_notification", label: "Team notification", description: "booking@stacey.de internal", group: "internal" },
];

const GROUP_LABELS: Record<TemplateGroup, string> = {
  onboarding: "Onboarding",
  payment: "Payment & deposit",
  rent: "Rent",
  "move-out": "Move-out",
  "short-stay": "SHORT stay",
  internal: "Internal",
};

const GROUP_COLORS: Record<TemplateGroup, string> = {
  onboarding: "bg-green-100 text-green-700",
  payment: "bg-blue-100 text-blue-700",
  rent: "bg-orange-100 text-orange-700",
  "move-out": "bg-red-100 text-red-700",
  "short-stay": "bg-purple-100 text-purple-700",
  internal: "bg-gray-100 text-gray-700",
};

function templateMeta(key: string): TemplateDef {
  return (
    TEMPLATES.find((t) => t.key === key) ?? {
      key,
      label: key,
      description: "(unknown template)",
      group: "internal",
    }
  );
}

/* ─── Formatters ───────────────────────────────────────── */

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }) +
    " " +
    d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
  );
}

/* ─── Main ─────────────────────────────────────────────── */

export default function EmailsPage({
  emails,
  tenants,
}: {
  emails: SentEmail[];
  tenants: Tenant[];
}) {
  const router = useRouter();
  const [templateFilter, setTemplateFilter] = useState<string>("");
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [triggerFilter, setTriggerFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  // Quick-send
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [sending, setSending] = useState(false);
  // Template-specific extras (only shown when a matching template is picked)
  const [terminationReason, setTerminationReason] = useState("");
  const [terminationMoveOutDate, setTerminationMoveOutDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );

  // Preview modal
  const [previewId, setPreviewId] = useState<string | null>(null);

  // Resend state
  const [resendingId, setResendingId] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      total: emails.length,
      sent: emails.filter((e) => e.status === "sent").length,
      failed: emails.filter((e) => e.status === "failed").length,
      skipped: emails.filter((e) => e.status === "skipped").length,
      manual: emails.filter((e) => e.triggeredBy === "manual_resend").length,
      successRate:
        emails.filter((e) => e.status === "sent" || e.status === "skipped")
          .length /
        Math.max(1, emails.length),
    }),
    [emails]
  );

  const failed = useMemo(
    () => emails.filter((e) => e.status === "failed").slice(0, 20),
    [emails]
  );

  const filtered = useMemo(() => {
    return emails.filter((e) => {
      if (templateFilter && e.templateKey !== templateFilter) return false;
      const meta = templateMeta(e.templateKey);
      if (groupFilter && meta.group !== groupFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      if (triggerFilter) {
        if (triggerFilter === "manual" && e.triggeredBy !== "manual_resend")
          return false;
        if (triggerFilter === "auto" && e.triggeredBy === "manual_resend")
          return false;
      }
      if (search) {
        const s = search.toLowerCase();
        if (
          !e.recipient.toLowerCase().includes(s) &&
          !(e.tenantName ?? "").toLowerCase().includes(s) &&
          !meta.label.toLowerCase().includes(s) &&
          !e.templateKey.toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [emails, templateFilter, groupFilter, statusFilter, triggerFilter, search]);

  async function quickSend() {
    if (!selectedTenantId || !selectedTemplate) {
      alert("Mieter und Template auswählen");
      return;
    }
    const tenant = tenants.find((t) => t.id === selectedTenantId);

    // Template-specific required inputs
    const extras: Record<string, string> = {};
    if (selectedTemplate === "termination") {
      if (!terminationReason.trim()) {
        alert("Kündigungsgrund erforderlich");
        return;
      }
      if (!terminationMoveOutDate) {
        alert("Auszugsdatum erforderlich");
        return;
      }
      extras.terminationReason = terminationReason.trim();
      extras.terminationMoveOutDate = terminationMoveOutDate;
    }

    if (
      !confirm(
        `${templateMeta(selectedTemplate).label} an ${tenant?.name} <${tenant?.email}> senden?`
      )
    )
      return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/emails/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateKey: selectedTemplate,
          tenantId: selectedTenantId,
          ...extras,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(`✓ Email gesendet an ${data.sentTo}`);
        setSelectedTemplate("");
        setTerminationReason("");
        router.refresh();
      } else {
        alert(`Fehler: ${data.error ?? res.statusText}`);
      }
    } finally {
      setSending(false);
    }
  }

  async function resendFromLog(entry: SentEmail) {
    if (
      !confirm(
        `Resend ${templateMeta(entry.templateKey).label} to ${entry.tenantName ?? entry.recipient}?`
      )
    )
      return;
    setResendingId(entry.id);
    try {
      const res = await fetch(`/api/admin/emails/${entry.id}/resend`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(`✓ Resent to ${data.sentTo}`);
        router.refresh();
      } else {
        alert(`Failed: ${data.error ?? res.statusText}`);
      }
    } finally {
      setResendingId(null);
    }
  }

  const quickSendTemplates = TEMPLATES.filter((t) => t.canQuickSend);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-black">Emails</h1>
        <p className="text-sm text-gray mt-1 max-w-2xl">
          Central log of every email the system sends — automated and
          manual. Failed sends can be retried here, and every template has
          a full history back to 500 rows.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <Stat label="Total logged" value={String(stats.total)} />
        <Stat
          label="Sent"
          value={String(stats.sent)}
          tone="ok"
        />
        <Stat
          label="Failed"
          value={String(stats.failed)}
          tone={stats.failed > 0 ? "warn" : "ok"}
        />
        <Stat
          label="Skipped (test)"
          value={String(stats.skipped)}
        />
        <Stat
          label="Success rate"
          value={`${Math.round(stats.successRate * 100)}%`}
          tone={stats.successRate >= 0.95 ? "ok" : "warn"}
        />
      </div>

      {/* Failed alerts at top — most actionable */}
      {failed.length > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-[5px] overflow-hidden">
          <div className="px-4 py-2 bg-red-100 border-b border-red-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-700" />
            <span className="text-sm font-semibold text-red-900">
              {failed.length} failed email{failed.length === 1 ? "" : "s"}
            </span>
            <span className="text-xs text-red-700">
              · retry below, or investigate the error
            </span>
          </div>
          <div className="divide-y divide-red-100">
            {failed.map((e) => {
              const meta = templateMeta(e.templateKey);
              return (
                <div
                  key={e.id}
                  className="px-4 py-2 flex items-center justify-between gap-3 flex-wrap text-sm hover:bg-red-50/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{meta.label}</span>
                      <span className="text-xs text-gray">
                        → {e.tenantName ?? e.recipient}
                      </span>
                      <span className="text-[10px] text-gray tabular-nums">
                        {fmtDateTime(e.sentAt)}
                      </span>
                    </div>
                    {e.error && (
                      <div
                        className="text-xs text-red-700 truncate mt-0.5"
                        title={e.error}
                      >
                        {e.error}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewId(e.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-red-300 rounded-[5px] hover:bg-white"
                    >
                      <Info className="w-3 h-3" /> Details
                    </button>
                    <button
                      onClick={() => resendFromLog(e)}
                      disabled={resendingId === e.id}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-red-700 text-white rounded-[5px] hover:bg-red-800 disabled:opacity-50"
                    >
                      <RefreshCw className="w-3 h-3" />{" "}
                      {resendingId === e.id ? "Retrying…" : "Retry"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick send */}
      <div className="bg-white rounded-[5px] border border-lightgray p-4 mb-4">
        <div className="flex items-center gap-2 text-xs text-gray uppercase tracking-wide mb-2">
          <Send className="w-3.5 h-3.5" />
          Quick send
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs text-gray mb-1">Tenant</label>
            <TenantCombobox
              tenants={tenants}
              value={selectedTenantId}
              onChange={setSelectedTenantId}
            />
          </div>
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs text-gray mb-1">Template</label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
            >
              <option value="">— pick template —</option>
              {quickSendTemplates.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label} — {t.description}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={quickSend}
            disabled={sending || !selectedTenantId || !selectedTemplate}
            className="px-4 py-2 rounded-[5px] bg-black text-white text-sm hover:bg-black/90 disabled:opacity-40"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>

        {/* Template-specific extra inputs */}
        {selectedTemplate === "termination" && (
          <div className="mt-3 p-3 bg-background-alt rounded-[5px] border border-lightgray">
            <p className="text-xs text-gray mb-2">
              Termination template requires two additional inputs:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="block">
                <span className="block text-xs text-gray mb-1">
                  Kündigungsgrund
                </span>
                <input
                  type="text"
                  value={terminationReason}
                  onChange={(e) => setTerminationReason(e.target.value)}
                  placeholder="e.g. Zahlungsrückstand gem. § 543 BGB"
                  className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
                />
              </label>
              <label className="block">
                <span className="block text-xs text-gray mb-1">
                  Auszugsdatum
                </span>
                <input
                  type="date"
                  value={terminationMoveOutDate}
                  onChange={(e) => setTerminationMoveOutDate(e.target.value)}
                  className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
                />
              </label>
            </div>
          </div>
        )}

        <p className="text-[11px] text-gray mt-2">
          Quick Send supports {quickSendTemplates.length} manual templates
          for fresh sends. Others fire automatically from cron/webhooks —
          to re-fire any past send exactly as it was, use the Resend
          button in the log below.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray pointer-events-none" />
          <input
            type="text"
            placeholder="Search name / email / template…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 border border-lightgray rounded-[5px] text-sm bg-white"
          />
        </div>
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="px-2 py-1.5 border border-lightgray rounded-[5px] text-sm bg-white"
        >
          <option value="">All groups</option>
          {Object.entries(GROUP_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={templateFilter}
          onChange={(e) => setTemplateFilter(e.target.value)}
          className="px-2 py-1.5 border border-lightgray rounded-[5px] text-sm bg-white"
        >
          <option value="">All templates</option>
          {TEMPLATES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2 py-1.5 border border-lightgray rounded-[5px] text-sm bg-white"
        >
          <option value="">All statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="skipped">Skipped (test)</option>
        </select>
        <select
          value={triggerFilter}
          onChange={(e) => setTriggerFilter(e.target.value)}
          className="px-2 py-1.5 border border-lightgray rounded-[5px] text-sm bg-white"
        >
          <option value="">Auto + manual</option>
          <option value="auto">Auto only</option>
          <option value="manual">Manual resends</option>
        </select>
        <span className="text-xs text-gray ml-auto">{filtered.length} rows</span>
      </div>

      {/* Log table */}
      <div className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background-alt border-b border-lightgray">
                <th className="px-3 py-2 text-left text-xs text-gray uppercase">When</th>
                <th className="px-3 py-2 text-left text-xs text-gray uppercase">Template</th>
                <th className="px-3 py-2 text-left text-xs text-gray uppercase">Recipient</th>
                <th className="px-3 py-2 text-left text-xs text-gray uppercase">Trigger</th>
                <th className="px-3 py-2 text-left text-xs text-gray uppercase">Status</th>
                <th className="px-3 py-2 text-right text-xs text-gray uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray">
                    No emails match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const meta = templateMeta(e.templateKey);
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-lightgray/50 hover:bg-background-alt/40"
                    >
                      <td className="px-3 py-2 text-xs tabular-nums whitespace-nowrap">
                        {fmtDateTime(e.sentAt)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded-[5px] text-[10px] font-semibold ${GROUP_COLORS[meta.group]}`}
                          >
                            {GROUP_LABELS[meta.group]}
                          </span>
                          <span className="font-medium">{meta.label}</span>
                        </div>
                        <div className="text-[10px] text-gray font-mono mt-0.5">
                          {e.templateKey}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {e.tenantId && e.tenantName ? (
                          <Link
                            href={`/admin/tenants/${e.tenantId}`}
                            className="font-medium hover:underline"
                          >
                            {e.tenantName}
                          </Link>
                        ) : (
                          <span className="font-medium">
                            {e.recipient.split("@")[0]}
                          </span>
                        )}
                        <div className="text-[10px] text-gray">{e.recipient}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded-[5px] text-[10px] font-semibold ${
                            e.triggeredBy === "manual_resend"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {e.triggeredBy === "manual_resend"
                            ? "Manual"
                            : e.triggeredBy.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {e.status === "sent" ? (
                          <span className="inline-flex items-center gap-1 text-green-700 text-xs">
                            <CheckCircle2 className="w-3 h-3" /> Sent
                          </span>
                        ) : e.status === "failed" ? (
                          <span
                            className="inline-flex items-center gap-1 text-red-600 text-xs"
                            title={e.error ?? "Unknown error"}
                          >
                            <XCircle className="w-3 h-3" /> Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray text-xs">
                            <Filter className="w-3 h-3" /> Skipped
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPreviewId(e.id)}
                            className="px-2 py-0.5 rounded-[5px] text-[10px] border border-lightgray hover:bg-background-alt"
                          >
                            Details
                          </button>
                          {e.tenantId && (
                            <button
                              onClick={() => resendFromLog(e)}
                              disabled={resendingId === e.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[10px] border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                            >
                              <RefreshCw className="w-3 h-3" />
                              {resendingId === e.id ? "…" : "Resend"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {previewId && (
        <PreviewModal
          emailId={previewId}
          onClose={() => setPreviewId(null)}
        />
      )}
    </div>
  );
}

/* ─── Preview modal ────────────────────────────────────── */

function PreviewModal({
  emailId,
  onClose,
}: {
  emailId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<{
    templateKey: string;
    recipient: string;
    subject: string | null;
    resendId: string | null;
    status: string;
    error: string | null;
    triggeredBy: string;
    sentAt: string;
  } | null>(null);

  useMemo(() => {
    fetch(`/api/admin/emails/${emailId}/preview`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [emailId]);

  const meta = data ? templateMeta(data.templateKey) : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[5px] w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-lightgray flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">
              {meta?.label ?? "Email details"}
            </h3>
            {meta && (
              <p className="text-xs text-gray mt-0.5">{meta.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-background-alt rounded-[5px]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 overflow-auto flex-1 space-y-2 text-sm">
          {!data ? (
            <p className="text-gray">Loading…</p>
          ) : (
            <>
              <Field label="Template">
                <code className="text-xs bg-background-alt px-2 py-0.5 rounded-[3px]">
                  {data.templateKey}
                </code>
              </Field>
              <Field label="Recipient">{data.recipient}</Field>
              <Field label="Subject">{data.subject ?? "—"}</Field>
              <Field label="Status">
                {data.status === "sent"
                  ? "✓ Sent"
                  : data.status === "failed"
                    ? "✗ Failed"
                    : "⊘ Skipped (test mode)"}
              </Field>
              <Field label="Triggered by">{data.triggeredBy}</Field>
              <Field label="Sent at">{fmtDateTime(data.sentAt)}</Field>
              {data.resendId && (
                <Field label="Resend ID">
                  <code className="text-xs font-mono">{data.resendId}</code>
                </Field>
              )}
              {data.error && (
                <Field label="Error">
                  <span className="text-red-600 text-xs">{data.error}</span>
                </Field>
              )}
              <p className="text-xs text-gray pt-3 border-t border-lightgray">
                Full HTML preview of the rendered body isn't stored per
                send (keeps the log table small). To see the current
                template design, use the tenant folio's Quick Send
                against a test tenant.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-xs text-gray uppercase tracking-wide w-28 flex-shrink-0">
        {label}
      </span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

/* ─── Tenant combobox (searchable) ─────────────────────── */

function TenantCombobox({
  tenants,
  value,
  onChange,
}: {
  tenants: Tenant[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selected = tenants.find((t) => t.id === value) ?? null;

  // Close on click outside
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tenants.slice(0, 50);
    return tenants
      .filter((t) => {
        const hay = `${t.name} ${t.email}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 50);
  }, [tenants, query]);

  function pick(t: Tenant) {
    onChange(t.id);
    setQuery("");
    setOpen(false);
  }

  function clearSelection() {
    onChange("");
    setQuery("");
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center border border-lightgray rounded-[5px] bg-white">
        <Search className="w-3.5 h-3.5 ml-2.5 text-gray pointer-events-none flex-shrink-0" />
        {selected && !open ? (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setQuery("");
            }}
            className="flex-1 text-left px-2 py-2 text-sm truncate"
          >
            {selected.name}{" "}
            <span className="text-gray text-xs">({selected.email})</span>
          </button>
        ) : (
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Type name or email…"
            className="flex-1 px-2 py-2 text-sm bg-transparent focus:outline-none min-w-0"
            autoComplete="off"
          />
        )}
        {selected && (
          <button
            type="button"
            onClick={clearSelection}
            className="px-2 py-1 text-gray hover:text-black flex-shrink-0"
            aria-label="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="px-2 py-1 text-gray hover:text-black flex-shrink-0"
          aria-label="Toggle list"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-lightgray rounded-[5px] shadow-lg max-h-80 overflow-y-auto z-20">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-gray">
              No tenants match "{query}"
            </div>
          ) : (
            <>
              {filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pick(t)}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-background-alt ${
                    t.id === value ? "bg-pink/10" : ""
                  }`}
                >
                  <div className="font-medium truncate">{t.name}</div>
                  <div className="text-[11px] text-gray truncate">{t.email}</div>
                </button>
              ))}
              {!query && tenants.length > 50 && (
                <div className="px-3 py-2 text-[11px] text-gray border-t border-lightgray">
                  Showing first 50 — type to search all {tenants.length}.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Stat card ────────────────────────────────────────── */

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  const toneClass =
    tone === "ok"
      ? "text-green-600"
      : tone === "warn"
        ? "text-orange-600"
        : "text-black";
  return (
    <div className="bg-white rounded-[5px] border border-lightgray p-3">
      <div className="text-[11px] uppercase tracking-wide text-gray flex items-center gap-1">
        <Mail className="w-3 h-3" />
        {label}
      </div>
      <div className={`text-xl font-bold mt-1 ${toneClass}`}>{value}</div>
    </div>
  );
}
