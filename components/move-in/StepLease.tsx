"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertCircle, ArrowRight, Check, CreditCard, FileText, Key, Lock, Mail, Phone, Shield, Sparkles } from "lucide-react";

export default function StepLease({
  signingUrl,
  signatureRequestId,
  devMode,
  onSigned,
}: {
  signingUrl: string | null;
  signatureRequestId?: string | null;
  devMode?: boolean;
  onSigned: () => void;
}) {
  const [signed, setSigned] = useState(false);
  const [opened, setOpened] = useState(false);

  // Derived from other state, no setState needed, which keeps the effect
  // below compliant with the react-hooks/set-state-in-effect rule.
  const polling = opened && Boolean(signatureRequestId) && !signed;

  // Poll Yousign for signature status after user opens the signing page
  useEffect(() => {
    if (!opened || !signatureRequestId || signed) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/lease/status?id=${signatureRequestId}`);
        const body = await res.json();
        const status = body?.ok ? body.data.status : null;
        if (status === "done" || status === "signed" || status === "completed") {
          setSigned(true);
          clearInterval(interval);
        }
      } catch {
        // ignore polling errors
      }
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [opened, signatureRequestId, signed, setSigned]);

  const openSigning = useCallback(() => {
    if (signingUrl) {
      window.open(signingUrl, "_blank", "noopener,noreferrer");
      setOpened(true);
    }
  }, [signingUrl]);

  // ─── Dev mode: no Yousign configured ───
  if (devMode || !signingUrl) {
    return (
      <div>
        <Header step={2} />
        <h2 className="mt-6 text-2xl font-bold sm:text-3xl">
          Your <em className="font-bold italic">lease agreement</em>
        </h2>
        <p className="mt-2 text-sm text-gray">
          Review and sign your rental agreement digitally.
        </p>

        <div className="mt-8 rounded-[5px] border-2 border-dashed border-[#E8E6E0] p-8 text-center">
          <AlertCircle size={32} className="mx-auto text-[#E8E6E0]" />
          <p className="mt-4 text-sm font-semibold">
            E-Signature not configured yet
          </p>
          <p className="mt-1 text-xs text-gray">
            Yousign API key is missing. The lease document has been generated
            successfully.
          </p>
          <button
            onClick={onSigned}
            className="mt-6 inline-flex items-center gap-2 rounded-[5px] bg-black px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-80"
          >
            Continue without signing (dev)
          </button>
        </div>
      </div>
    );
  }

  // ─── Signed state ───
  if (signed) {
    return (
      <div>
        <Header step={2} signed />
        <h2 className="mt-6 text-2xl font-bold sm:text-3xl">
          Your <em className="font-bold italic">lease agreement</em>
        </h2>

        <div className="mt-8 overflow-hidden rounded-[5px] border border-[#E8E6E0] bg-white">
          <div className="p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-black">
              <Check size={24} className="text-white" strokeWidth={3} />
            </div>
            <p className="mt-4 text-lg font-bold">Lease agreement signed</p>
            <p className="mt-1 text-sm text-gray">
              You&apos;ll receive a copy of the signed document by email.
            </p>
            <button
              onClick={onSigned}
              className="mt-6 inline-flex items-center gap-2 rounded-[5px] bg-black px-8 py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-80"
            >
              Continue to payment <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Default: not yet opened OR waiting for signature ───
  return (
    <div>
      <Header step={2} />

      <h2 className="mt-6 text-2xl font-bold sm:text-3xl">
        Let&apos;s make it <em className="font-bold italic">official</em>
      </h2>
      <p className="mt-2 text-sm text-gray">
        Review your personalized lease, then sign digitally. Takes about two
        minutes, nothing to print, no wet ink.
      </p>

      {/* Main action card, document metadata + CTA + trust row. The doc
          metadata line anchors the CTA as a real artefact, not a vague
          "click to proceed" link. */}
      <div className="mt-8 overflow-hidden rounded-[5px] border border-[#E8E6E0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {/* Doc header */}
        <div className="flex items-center gap-3 border-b border-[#F0F0F0] bg-[#FAFAFA] px-6 py-4">
          <div className="flex h-10 w-8 shrink-0 items-center justify-center rounded-[3px] bg-white ring-1 ring-[#E8E6E0]">
            <FileText size={16} className="text-black" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Lease agreement · PDF</p>
            <p className="text-xs text-gray">Personalized for your tenancy · generated just now</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-8 text-center">
          {!opened ? (
            <>
              <p className="text-lg font-bold">Your lease is ready</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray">
                Open the signing page to review the full agreement, then sign
                with one click. The document opens in a new tab so you can
                compare with this page.
              </p>
              <button
                onClick={openSigning}
                className="mt-6 inline-flex items-center gap-2 rounded-[5px] bg-black px-8 py-3.5 text-sm font-bold text-white transition-all duration-200 hover:opacity-80"
              >
                Review &amp; sign lease <ArrowRight size={14} />
              </button>
            </>
          ) : (
            <>
              {/* Pulsing dot = polling, feels more alive than a spinner */}
              <div className="mx-auto flex h-12 w-12 items-center justify-center">
                <span className="relative flex h-3 w-3">
                  {polling && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink opacity-60" />
                  )}
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-pink" />
                </span>
              </div>
              <p className="mt-2 text-lg font-bold">Waiting for your signature</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-gray">
                Complete the signing in the tab we just opened. This page
                updates automatically the moment you&apos;re done.
              </p>
              <button
                onClick={openSigning}
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-gray transition-colors hover:text-black"
              >
                Open signing page again <ArrowRight size={12} />
              </button>
              <div className="mt-6 border-t border-[#F0F0F0] pt-4">
                <button
                  onClick={() => setSigned(true)}
                  className="text-xs text-gray underline transition-colors hover:text-black"
                >
                  I&apos;ve already signed
                </button>
              </div>
            </>
          )}
        </div>

        {/* Trust row, replaces the tiny gray line. Upgraded to 3 pillars,
            same visual weight, so the signature feels backed by serious
            infra. */}
        <div className="grid grid-cols-3 gap-2 border-t border-[#F0F0F0] bg-[#FAFAFA] px-6 py-4 text-center">
          <TrustBadge icon={<Shield size={14} />} label="eIDAS compliant" sub="EU e-signature law" />
          <TrustBadge icon={<Lock size={14} />} label="Encrypted" sub="TLS + signed hash" />
          <TrustBadge icon={<FileText size={14} />} label="Legally binding" sub="Audit trail included" />
        </div>
      </div>

      {/* What happens next, 3-step visual so users know there's no hidden
          step after signing. The current step pulses pink; completed ones
          are checkmarked; upcoming ones are dimmed. */}
      <div className="mt-10">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray">
          What happens next
        </p>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NextStep
            num={1}
            current
            icon={<FileText size={14} />}
            title="Sign lease"
            body="Right here, right now"
          />
          <NextStep
            num={2}
            icon={<CreditCard size={14} />}
            title="Pay booking fee"
            body="€195 via Stripe, straight after signing · non-refundable"
          />
          <NextStep
            num={3}
            icon={<Sparkles size={14} />}
            title="Pay deposit"
            body="Within 48h via a separate email link"
          />
          <NextStep
            num={4}
            icon={<Key size={14} />}
            title="Move in"
            body="Access details 3 days before your start date"
          />
        </ol>
      </div>

      {/* Support footer, small but visible. Reduces legal-doc anxiety. */}
      <div className="mt-8 flex flex-col items-start gap-3 rounded-[5px] bg-[#FAFAFA] p-4 text-xs text-gray sm:flex-row sm:items-center sm:justify-between">
        <p>
          Questions before you sign? We&apos;re happy to walk you through anything.
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href="mailto:booking@stacey.de"
            className="inline-flex items-center gap-1.5 font-medium text-black transition-colors hover:text-pink"
          >
            <Mail size={12} /> booking@stacey.de
          </a>
          <a
            href="tel:+4940696389600"
            className="inline-flex items-center gap-1.5 font-medium text-black transition-colors hover:text-pink"
          >
            <Phone size={12} /> +49 40 696389600
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────

// Progress rail, sits above the headline so the user always knows how
// many steps are left. We count from the submit point: About you → Sign
// lease → Pay deposit = 3 steps. The "signed" branch shows step 2 as
// completed.
function Header({ step, signed }: { step: number; signed?: boolean }) {
  const labels = ["Your details", "Sign lease", "Pay booking fee"];
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray">
        Step {signed ? step + 1 : step} of 3, {labels[signed ? step : step - 1]}
      </p>
      <div className="mt-2 flex gap-1.5">
        {labels.map((_, i) => {
          const isDone = i < step - 1 || (signed && i < step);
          const isCurrent = !signed && i === step - 1;
          return (
            <span
              key={i}
              className={
                isDone
                  ? "h-1 flex-1 rounded-full bg-black"
                  : isCurrent
                    ? "h-1 flex-1 rounded-full bg-pink"
                    : "h-1 flex-1 rounded-full bg-[#E8E6E0]"
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function TrustBadge({
  icon,
  label,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-black">{icon}</span>
      <p className="text-[11px] font-semibold text-black">{label}</p>
      <p className="text-[10px] text-gray">{sub}</p>
    </div>
  );
}

function NextStep({
  num,
  icon,
  title,
  body,
  current,
}: {
  num: number;
  icon: React.ReactNode;
  title: string;
  body: string;
  current?: boolean;
}) {
  return (
    <li
      className={
        current
          ? "relative rounded-[5px] border border-pink/30 bg-pink/5 p-4"
          : "relative rounded-[5px] border border-[#E8E6E0] bg-white p-4 opacity-70"
      }
    >
      <div className="flex items-center gap-2">
        <span
          className={
            current
              ? "flex h-6 w-6 items-center justify-center rounded-full bg-pink text-[11px] font-bold text-white"
              : "flex h-6 w-6 items-center justify-center rounded-full bg-[#F0F0F0] text-[11px] font-bold text-gray"
          }
        >
          {num}
        </span>
        <span className={current ? "text-black" : "text-gray"}>{icon}</span>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-gray">{body}</p>
    </li>
  );
}
