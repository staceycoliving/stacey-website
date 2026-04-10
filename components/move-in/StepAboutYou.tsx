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
            <select
              value={country || ""}
              onChange={(e) => setCountry?.(e.target.value)}
              className={clsx(inputClass, !country && "text-gray")}
            >
              <option value="">Country</option>
              <option value="DE">Germany</option>
              <option value="AT">Austria</option>
              <option value="CH">Switzerland</option>
              <option value="NL">Netherlands</option>
              <option value="DK">Denmark</option>
              <option value="PL">Poland</option>
              <option value="FR">France</option>
              <option value="IT">Italy</option>
              <option value="ES">Spain</option>
              <option value="GB">United Kingdom</option>
              <option value="US">United States</option>
              <option value="SE">Sweden</option>
              <option value="NO">Norway</option>
              <option value="FI">Finland</option>
              <option value="BE">Belgium</option>
              <option value="CZ">Czech Republic</option>
              <option value="PT">Portugal</option>
              <option value="IE">Ireland</option>
              <option value="GR">Greece</option>
              <option value="HU">Hungary</option>
              <option value="RO">Romania</option>
              <option value="BG">Bulgaria</option>
              <option value="HR">Croatia</option>
              <option value="SK">Slovakia</option>
              <option value="SI">Slovenia</option>
              <option value="LT">Lithuania</option>
              <option value="LV">Latvia</option>
              <option value="EE">Estonia</option>
              <option value="LU">Luxembourg</option>
              <option value="TR">Turkey</option>
              <option value="IN">India</option>
              <option value="CN">China</option>
              <option value="JP">Japan</option>
              <option value="KR">South Korea</option>
              <option value="BR">Brazil</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="NZ">New Zealand</option>
            </select>
          </div>
        </div>

      </div>
    </div>
  );
}
