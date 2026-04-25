"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import SignaturePad from "signature_pad";

const NATIONALITIES = [
  "Afghan", "Albanian", "Algerian", "American", "Argentine", "Australian",
  "Austrian", "Bangladeshi", "Belgian", "Bolivian", "Brazilian", "British",
  "Bulgarian", "Cameroonian", "Canadian", "Chilean", "Chinese", "Colombian",
  "Croatian", "Czech", "Danish", "Dutch", "Ecuadorian", "Egyptian",
  "Estonian", "Ethiopian", "Filipino", "Finnish", "French", "Georgian",
  "German", "Ghanaian", "Greek", "Hungarian", "Icelandic", "Indian",
  "Indonesian", "Iranian", "Iraqi", "Irish", "Israeli", "Italian",
  "Jamaican", "Japanese", "Jordanian", "Kazakh", "Kenyan", "Korean",
  "Kuwaiti", "Latvian", "Lebanese", "Lithuanian", "Luxembourgish",
  "Malaysian", "Mexican", "Moldovan", "Mongolian", "Moroccan", "Nepalese",
  "New Zealander", "Nigerian", "Norwegian", "Pakistani", "Peruvian",
  "Polish", "Portuguese", "Romanian", "Russian", "Saudi", "Serbian",
  "Singaporean", "Slovak", "Slovenian", "South African", "Spanish",
  "Sri Lankan", "Swedish", "Swiss", "Syrian", "Taiwanese", "Thai",
  "Tunisian", "Turkish", "Ukrainian", "Uruguayan", "Uzbek", "Venezuelan",
  "Vietnamese",
];

export default function CheckinPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background-alt" />}>
      <CheckinPage />
    </Suspense>
  );
}

function CheckinPage() {
  const params = useSearchParams();
  const reservationId = params.get("reservation") || "";
  const locationSlug = params.get("location") || "";
  const locationName = params.get("name") || "STACEY";
  const prefillFirstName = params.get("firstName") || "";
  const prefillLastName = params.get("lastName") || "";
  const arrivalDate = params.get("arrival") || "";
  const departureDate = params.get("departure") || "";

  const [alreadyDone, setAlreadyDone] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [hasCompanion, setHasCompanion] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sigPadRef = useRef<SignaturePad | null>(null);

  const [form, setForm] = useState({
    firstName: prefillFirstName,
    lastName: prefillLastName,
    dateOfBirth: "",
    nationality: "",
    idDocumentType: "passport",
    idDocumentNumber: "",
    street: "",
    zipCode: "",
    city: "",
    country: "",
    companionFirstName: "",
    companionLastName: "",
  });

  useEffect(() => {
    if (!reservationId) return;
    fetch(`/api/checkin?reservationId=${reservationId}`)
      .then(r => r.json())
      .then(data => { if (data.completed) setAlreadyDone(true); })
      .catch(() => {});
  }, [reservationId]);

  // Initialize signature pad
  useEffect(() => {
    if (!canvasRef.current || sigPadRef.current) return;
    const canvas = canvasRef.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d")?.scale(ratio, ratio);

    const pad = new SignaturePad(canvas, {
      backgroundColor: "rgb(250, 250, 250)",
      penColor: "#1A1A1A",
    });
    pad.addEventListener("endStroke", () => setHasSigned(!pad.isEmpty()));
    sigPadRef.current = pad;
  });

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.dateOfBirth || !form.nationality ||
        !form.idDocumentNumber || !form.street || !form.zipCode || !form.city || !form.country) {
      setError("Please fill in all required fields.");
      return;
    }
    if (hasCompanion && (!form.companionFirstName || !form.companionLastName)) {
      setError("Please fill in your companion's name.");
      return;
    }
    if (!confirmed) {
      setError("Please confirm that your information is correct.");
      return;
    }
    if (!hasSigned || sigPadRef.current?.isEmpty()) {
      setError("Please sign the registration form.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId,
          ...form,
          companionFirstName: hasCompanion ? form.companionFirstName : undefined,
          companionLastName: hasCompanion ? form.companionLastName : undefined,
          arrivalDate,
          departureDate,
          locationSlug,
          locationName,
          signatureDataUrl: sigPadRef.current?.toDataURL("image/png"),
        }),
      });
      const data = await res.json();
      if (data.ok) setSubmitted(true);
      else setError(data.error || "Something went wrong.");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  if (alreadyDone) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-[5px] p-10 text-center shadow-sm">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-3">Registration complete</h1>
          <p className="text-[#555] text-base leading-relaxed">
            Your guest registration for {locationName} has already been submitted.
            You'll receive your digital access details by email.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-[5px] p-10 text-center shadow-sm">
          <div className="text-4xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-3">You're all set!</h1>
          <p className="text-[#555] text-base leading-relaxed">
            Thank you for completing your registration.
            Your digital access to {locationName} will be activated shortly ,
            you'll receive an email with your access details.
          </p>
        </div>
      </div>
    );
  }

  const inputClass = "w-full border border-gray-200 rounded-[5px] p-3 text-sm text-[#1A1A1A] placeholder:text-gray-400 focus:outline-none focus:border-[#FCB0C0]";
  const labelClass = "block text-xs font-medium text-[#888] mb-1";

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full bg-white rounded-[5px] p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">Guest Registration</h1>
          <p className="text-sm text-[#888]">{locationName} · Meldeschein</p>
        </div>

        <p className="text-[#555] text-sm leading-relaxed mb-6">
          German law requires all guests to complete a registration form before check-in.
          Please fill in your details below to activate your digital room access.
        </p>

        {/* Personal Details */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-3 pb-2 border-b border-[#FCB0C0]">Personal details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>First name *</label>
              <input className={inputClass} value={form.firstName} onChange={e => updateField("firstName", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Last name *</label>
              <input className={inputClass} value={form.lastName} onChange={e => updateField("lastName", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className={labelClass}>Date of birth *</label>
              <input type="date" className={inputClass} value={form.dateOfBirth} onChange={e => updateField("dateOfBirth", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Nationality *</label>
              <select className={inputClass} value={form.nationality} onChange={e => updateField("nationality", e.target.value)}>
                <option value="">Select...</option>
                {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ID Document */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-3 pb-2 border-b border-[#FCB0C0]">ID document</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Document type *</label>
              <select className={inputClass} value={form.idDocumentType} onChange={e => updateField("idDocumentType", e.target.value)}>
                <option value="passport">Passport</option>
                <option value="id_card">ID Card</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Document number *</label>
              <input className={inputClass} placeholder="e.g. C01X00T47" value={form.idDocumentNumber} onChange={e => updateField("idDocumentNumber", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Home Address */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-3 pb-2 border-b border-[#FCB0C0]">Home address</h2>
          <div className="mb-3">
            <label className={labelClass}>Street + house number *</label>
            <input className={inputClass} placeholder="e.g. Musterstraße 12" value={form.street} onChange={e => updateField("street", e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Zip code *</label>
              <input className={inputClass} placeholder="12345" value={form.zipCode} onChange={e => updateField("zipCode", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>City *</label>
              <input className={inputClass} placeholder="Berlin" value={form.city} onChange={e => updateField("city", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Country *</label>
              <input className={inputClass} placeholder="Germany" value={form.country} onChange={e => updateField("country", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Companion */}
        <div className="mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasCompanion}
              onChange={e => setHasCompanion(e.target.checked)}
              className="w-4 h-4 accent-[#FCB0C0]"
            />
            <span className="text-sm text-[#1A1A1A]">I'm traveling with a companion</span>
          </label>

          {hasCompanion && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className={labelClass}>Companion first name *</label>
                <input className={inputClass} value={form.companionFirstName} onChange={e => updateField("companionFirstName", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Companion last name *</label>
                <input className={inputClass} value={form.companionLastName} onChange={e => updateField("companionLastName", e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Signature */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-3 pb-2 border-b border-[#FCB0C0]">Signature</h2>
          <p className="text-xs text-[#888] mb-2">Please sign below to confirm your registration.</p>
          <div className="relative border border-gray-200 rounded-[5px] overflow-hidden" style={{ height: 160 }}>
            <canvas
              ref={canvasRef}
              className="w-full"
              style={{ height: 160 }}
            />
            {!hasSigned && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-sm text-gray-300">Sign here</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              sigPadRef.current?.clear();
              setHasSigned(false);
            }}
            className="text-xs text-[#888] mt-1 hover:text-[#1A1A1A]"
          >
            Clear signature
          </button>
        </div>

        {/* Confirmation */}
        <div className="mb-6 p-4 bg-[#FAFAFA] rounded-[5px]">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="w-4 h-4 accent-[#FCB0C0] mt-0.5 flex-shrink-0"
            />
            <span className="text-sm text-[#555] leading-relaxed">
              I confirm that the information provided above is correct and complete.
              I understand that providing false information is a regulatory offense
              under German registration law.
            </span>
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || !confirmed || !hasSigned}
          className="w-full bg-[#1A1A1A] text-white py-3.5 rounded-[5px] font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting..." : "Complete registration"}
        </button>

        <p className="text-xs text-[#aaa] mt-4 text-center leading-relaxed">
          Your data is processed in accordance with German registration law (BMG)
          and our <a href="https://stacey.de/datenschutz" className="underline">privacy policy</a>.
        </p>
      </div>
    </div>
  );
}
