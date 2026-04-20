"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

type State = "idle" | "submitting" | "success" | "error";

export default function PartnersForm() {
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    setErrorMsg("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      company: String(fd.get("company") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      propertyCity: String(fd.get("propertyCity") ?? ""),
      propertySize: String(fd.get("propertySize") ?? ""),
      message: String(fd.get("message") ?? ""),
    };

    try {
      const res = await fetch("/api/partners-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Something went wrong.");
      }
      setState("success");
      form.reset();
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
    }
  }

  if (state === "success") {
    return (
      <div className="rounded-[5px] border-2 border-dashed border-pink bg-white p-10 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-pink">
          Received
        </p>
        <h3 className="mt-3 text-2xl font-extrabold tracking-tight">
          Thank <span className="italic font-light">you.</span>
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-gray">
          We received your inquiry and will get back to you within a few
          business days. For anything urgent, email{" "}
          <a
            href="mailto:booking@stacey.de"
            className="font-semibold text-black hover:text-pink"
          >
            booking@stacey.de
          </a>
          .
        </p>
      </div>
    );
  }

  // text-base on mobile (>=16px prevents iOS auto-zoom on focus), text-sm on desktop for visual density.
  const input =
    "w-full rounded-[5px] border border-lightgray bg-white px-4 py-3 text-base outline-none transition-colors focus:border-black sm:text-sm";
  const label =
    "mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-black/50";

  return (
    <form onSubmit={onSubmit}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={label}>Name *</label>
          <input id="name" name="name" type="text" required minLength={2} className={input} placeholder="Full name" />
        </div>
        <div>
          <label htmlFor="email" className={label}>Email *</label>
          <input id="email" name="email" type="email" required className={input} placeholder="you@company.com" />
        </div>
        <div>
          <label htmlFor="company" className={label}>Company</label>
          <input id="company" name="company" type="text" className={input} placeholder="Optional" />
        </div>
        <div>
          <label htmlFor="phone" className={label}>Phone</label>
          <input id="phone" name="phone" type="tel" className={input} placeholder="Optional" />
        </div>
        <div>
          <label htmlFor="propertyCity" className={label}>Property city</label>
          <input id="propertyCity" name="propertyCity" type="text" className={input} placeholder="e.g. Berlin" />
        </div>
        <div>
          <label htmlFor="propertySize" className={label}>Property size</label>
          <input id="propertySize" name="propertySize" type="text" className={input} placeholder="e.g. 40 apartments / 2,500 m²" />
        </div>
      </div>
      <div className="mt-5">
        <label htmlFor="message" className={label}>Message *</label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          rows={5}
          className={`${input} resize-none`}
          placeholder="Tell us about your property and what you're looking for."
        />
      </div>

      {state === "error" && (
        <p className="mt-4 text-sm text-red-600">
          {errorMsg || "Could not send the message. Please try again or email booking@stacey.de."}
        </p>
      )}

      <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={state === "submitting"}
          className="inline-flex items-center gap-2 rounded-[5px] bg-black px-8 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-80 disabled:opacity-50"
        >
          {state === "submitting" ? "Sending…" : (<>Send inquiry <ArrowRight size={15} /></>)}
        </button>
        <p className="text-[11px] leading-relaxed text-gray">
          By sending this form you agree to our{" "}
          <a href="/privacy" className="underline hover:text-black">Privacy Policy</a>.
        </p>
      </div>
    </form>
  );
}
