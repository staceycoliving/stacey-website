"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, Check, AlertCircle, ExternalLink, Loader2 } from "lucide-react";

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

  // Derived from other state — no setState needed, which keeps the effect
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

  // Dev mode: no Yousign
  if (devMode || !signingUrl) {
    return (
      <div>
        <h2 className="text-2xl font-bold sm:text-3xl">
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

  // Signed state
  if (signed) {
    return (
      <div>
        <h2 className="text-2xl font-bold sm:text-3xl">
          Your <em className="font-bold italic">lease agreement</em>
        </h2>

        <div className="mt-8 rounded-[5px] border border-[#E8E6E0] p-8 text-center">
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
            Continue to payment
          </button>
        </div>
      </div>
    );
  }

  // Waiting for signature
  return (
    <div>
      <h2 className="text-2xl font-bold sm:text-3xl">
        Your <em className="font-bold italic">lease agreement</em>
      </h2>
      <p className="mt-2 text-sm text-gray">
        Your personalized lease agreement has been generated. Please review and
        sign it digitally.
      </p>

      <div className="mt-8 rounded-[5px] border border-[#E8E6E0] p-8 text-center">
        {!opened ? (
          <>
            <FileText size={40} className="mx-auto text-black" />
            <p className="mt-4 text-lg font-bold">
              Your lease is ready to sign
            </p>
            <p className="mt-1 text-sm text-gray">
              Click below to open the signing page. You&apos;ll be able to
              review the full agreement before signing.
            </p>
            <button
              onClick={openSigning}
              className="mt-6 inline-flex items-center gap-2 rounded-[5px] bg-black px-8 py-3.5 text-sm font-bold text-white transition-all duration-200 hover:opacity-80"
            >
              Review &amp; sign lease <ExternalLink size={14} />
            </button>
          </>
        ) : (
          <>
            {polling && (
              <Loader2 size={28} className="mx-auto animate-spin text-gray" />
            )}
            <p className="mt-4 text-lg font-bold">Waiting for your signature</p>
            <p className="mt-1 text-sm text-gray">
              Complete the signing process in the tab that just opened. This page
              will update automatically.
            </p>
            <button
              onClick={openSigning}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-gray transition-colors hover:text-black"
            >
              Open signing page again <ExternalLink size={12} />
            </button>
            <div className="mt-6 border-t border-[#E8E6E0] pt-4">
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

      <div className="mt-4 flex items-center gap-2 text-xs text-gray">
        <FileText size={12} />
        <span>
          Powered by Yousign · eIDAS compliant · legally binding electronic
          signature
        </span>
      </div>
    </div>
  );
}
