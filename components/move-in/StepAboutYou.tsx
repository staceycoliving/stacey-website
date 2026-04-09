"use client";

import { clsx } from "clsx";
import type { StayType } from "@/lib/data";

const inputClass =
  "w-full rounded-[5px] border border-[#E8E6E0] px-4 py-3 text-sm outline-none transition-colors placeholder:text-[#C0C0C0] focus:border-black";

const reasons = [
  { value: "work", label: "Work / New job" },
  { value: "studies", label: "Studies / University" },
  { value: "personal", label: "Personal reasons" },
  { value: "other", label: "Other" },
];

export default function StepAboutYou({
  stayType,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  email,
  setEmail,
  // SHORT only
  phone,
  setPhone,
  moveInReason,
  setMoveInReason,
  message,
  setMessage,
  // LONG only
  dateOfBirth,
  setDateOfBirth,
  street,
  setStreet,
  zipCode,
  setZipCode,
  addressCity,
  setAddressCity,
  country,
  setCountry,
}: {
  stayType: StayType;
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone?: string;
  setPhone?: (v: string) => void;
  dateOfBirth?: string;
  setDateOfBirth?: (v: string) => void;
  street?: string;
  setStreet?: (v: string) => void;
  zipCode?: string;
  setZipCode?: (v: string) => void;
  addressCity?: string;
  setAddressCity?: (v: string) => void;
  country?: string;
  setCountry?: (v: string) => void;
  moveInReason?: string;
  setMoveInReason?: (v: string) => void;
  message?: string;
  setMessage?: (v: string) => void;
}) {
  const isLong = stayType === "LONG";

  return (
    <div>
      <h2 className="text-2xl font-bold sm:text-3xl">
        Tell us about <em className="not-italic font-bold italic">you</em>
      </h2>
      <p className="mt-2 text-sm text-gray">
        {isLong
          ? "We need a few details to prepare your lease agreement."
          : "We need a few details to complete your booking."}
      </p>

      <div className="mt-8 space-y-5">
        {/* Name row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">First name *</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Last name *</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" className={inputClass} />
          </div>
        </div>

        {/* Date of birth */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Date of birth *</label>
          <input
            type="date"
            value={dateOfBirth || ""}
            onChange={(e) => setDateOfBirth?.(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Email */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" className={inputClass} />
        </div>

        {/* Phone */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Phone *</label>
          <input type="tel" value={phone || ""} onChange={(e) => setPhone?.(e.target.value)} placeholder="+49 170 1234567" className={inputClass} />
        </div>

        {/* Current address */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Current address *</label>
          <div className="space-y-3">
            <input
              type="text"
              value={street || ""}
              onChange={(e) => setStreet?.(e.target.value)}
              placeholder="Street and house number"
              className={inputClass}
            />
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                value={zipCode || ""}
                onChange={(e) => setZipCode?.(e.target.value)}
                placeholder="Zip code"
                className={inputClass}
              />
              <input
                type="text"
                value={addressCity || ""}
                onChange={(e) => setAddressCity?.(e.target.value)}
                placeholder="City"
                className={clsx(inputClass, "col-span-2")}
              />
            </div>
            <input
              type="text"
              value={country || ""}
              onChange={(e) => setCountry?.(e.target.value)}
              placeholder="Country"
              className={inputClass}
            />
          </div>
        </div>

        {/* Move-in reason (SHORT + LONG) */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">{isLong ? "Why are you moving?" : "What brings you to Hamburg?"} *</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {reasons.map((r) => (
              <button
                key={r.value}
                onClick={() => setMoveInReason?.(r.value)}
                className={clsx(
                  "rounded-[5px] px-4 py-2.5 text-sm font-medium transition-all duration-200",
                  moveInReason === r.value
                    ? "bg-black text-white"
                    : "bg-[#F5F5F5] text-gray hover:bg-[#E8E6E0]"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Anything else? <span className="font-normal text-gray">(optional)</span>
          </label>
          <textarea
            value={message || ""}
            onChange={(e) => setMessage?.(e.target.value)}
            placeholder="Tell us anything you'd like us to know..."
            rows={3}
            className="w-full resize-none rounded-[5px] border border-[#E8E6E0] px-4 py-3 text-sm outline-none transition-colors placeholder:text-[#C0C0C0] focus:border-black"
          />
        </div>
      </div>
    </div>
  );
}
