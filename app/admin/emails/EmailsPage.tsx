"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Send, CheckCircle2, XCircle } from "lucide-react";

type SentEmail = {
  id: string;
  templateKey: string;
  recipient: string;
  subject: string | null;
  entityType: string | null;
  entityId: string | null;
  resendId: string | null;
  status: string;
  error: string | null;
  triggeredBy: string;
  sentAt: string;
};

type Tenant = { id: string; name: string; email: string };

const TEMPLATES: { key: string; label: string; description: string }[] = [
  { key: "welcome", label: "Welcome email", description: "nach Move-in" },
  { key: "payment_setup", label: "Payment setup link", description: "Zahlung einrichten" },
  { key: "rent_reminder", label: "Rent reminder", description: "offene Miete freundlich" },
  { key: "mahnung1", label: "1. Mahnung", description: "formell" },
  { key: "mahnung2", label: "2. Mahnung + Kündigung", description: "letzte Stufe" },
  { key: "deposit_return", label: "Deposit settlement", description: "Kautionsabrechnung" },
];

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

function labelFor(key: string) {
  return TEMPLATES.find((t) => t.key === key)?.label ?? key;
}

export default function EmailsPage({
  emails,
  tenants,
}: {
  emails: SentEmail[];
  tenants: Tenant[];
}) {
  const router = useRouter();
  const [templateFilter, setTemplateFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"" | "sent" | "failed">("");
  const [search, setSearch] = useState("");

  // Quick-send box state
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [sending, setSending] = useState(false);

  const filtered = useMemo(() => {
    return emails.filter((e) => {
      if (templateFilter && e.templateKey !== templateFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !e.recipient.toLowerCase().includes(s) &&
          !labelFor(e.templateKey).toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [emails, templateFilter, statusFilter, search]);

  async function quickSend() {
    if (!selectedTenantId || !selectedTemplate) {
      alert("Mieter und Template auswählen");
      return;
    }
    const tenant = tenants.find((t) => t.id === selectedTenantId);
    if (
      !confirm(
        `${labelFor(selectedTemplate)} an ${tenant?.name} <${tenant?.email}> senden?`
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
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(`✓ Email gesendet an ${data.sentTo}`);
        setSelectedTemplate("");
        router.refresh();
      } else {
        alert(`Fehler: ${data.error ?? res.statusText}`);
      }
    } finally {
      setSending(false);
    }
  }

  const stats = {
    total: emails.length,
    sent: emails.filter((e) => e.status === "sent").length,
    failed: emails.filter((e) => e.status === "failed").length,
    manual: emails.filter((e) => e.triggeredBy === "manual_resend").length,
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-black">Emails</h1>
        <p className="text-sm text-gray mt-1 max-w-2xl">
          Log aller manuell-versendeten Emails. Auto-Emails werden noch nicht
          geloggt — das kommt in einer Folge-Runde. Suche oder Quick-Send unten.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Stat label="Total logged" value={String(stats.total)} />
        <Stat label="Successful" value={String(stats.sent)} tone="ok" />
        <Stat label="Failed" value={String(stats.failed)} tone={stats.failed > 0 ? "warn" : "ok"} />
        <Stat label="Manual resends" value={String(stats.manual)} />
      </div>

      {/* Quick send */}
      <div className="bg-white rounded-[5px] border border-lightgray p-4 mb-4">
        <div className="flex items-center gap-2 text-xs text-gray uppercase tracking-wide mb-2">
          <Send className="w-3.5 h-3.5" />
          Quick send
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray mb-1">Tenant</label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
            >
              <option value="">— pick tenant —</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray mb-1">Template</label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 border border-lightgray rounded-[5px] text-sm bg-white"
            >
              <option value="">— pick template —</option>
              {TEMPLATES.map((t) => (
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
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <input
          type="text"
          placeholder="Search recipient or template…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-1.5 border border-lightgray rounded-[5px] text-sm bg-white"
        />
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
          onChange={(e) => setStatusFilter(e.target.value as "" | "sent" | "failed")}
          className="px-2 py-1.5 border border-lightgray rounded-[5px] text-sm bg-white"
        >
          <option value="">All statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
        <span className="text-xs text-gray">{filtered.length} rows</span>
      </div>

      {/* Log table */}
      <div className="bg-white rounded-[5px] border border-lightgray overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-background-alt border-b border-lightgray">
              <th className="px-3 py-2 text-left text-xs text-gray uppercase tracking-wide">
                Sent at
              </th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase tracking-wide">
                Template
              </th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase tracking-wide">
                Recipient
              </th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase tracking-wide">
                Trigger
              </th>
              <th className="px-3 py-2 text-left text-xs text-gray uppercase tracking-wide">
                Status
              </th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray">
                  No emails in log matching these filters.
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <tr key={e.id} className="border-b border-lightgray/50 hover:bg-background-alt/40">
                  <td className="px-3 py-2 text-xs tabular-nums whitespace-nowrap">
                    {fmtDateTime(e.sentAt)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-black">{labelFor(e.templateKey)}</div>
                    <div className="text-[10px] text-gray font-mono">{e.templateKey}</div>
                  </td>
                  <td className="px-3 py-2">{e.recipient}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-[5px] text-[10px] font-semibold ${
                        e.triggeredBy === "manual_resend"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {e.triggeredBy === "manual_resend" ? "Manual" : e.triggeredBy}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {e.status === "sent" ? (
                      <span className="inline-flex items-center gap-1 text-green-700 text-xs">
                        <CheckCircle2 className="w-3 h-3" /> Sent
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-red-600 text-xs"
                        title={e.error ?? "Unknown error"}
                      >
                        <XCircle className="w-3 h-3" /> Failed
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {e.entityType === "tenant" && e.entityId && (
                      <Link
                        href={`/admin/tenants/${e.entityId}`}
                        className="text-xs text-gray hover:text-black"
                      >
                        Folio &rarr;
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  const toneClass =
    tone === "ok" ? "text-green-600" : tone === "warn" ? "text-orange-600" : "text-black";
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
