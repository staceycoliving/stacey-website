"use client";

// Snapshot route for the welcome email. Renders the email at the
// canvas size used by the HowItWorks Step 03 mockup. No door code
// because the key is unlocked via the Salto / Kiwi mobile app.

export default function EmailSnap() {
  return (
    <div className="min-h-screen bg-[#F5F5F0] p-12">
      <div className="mx-auto max-w-xl">
        {/* Email header bar */}
        <div className="rounded-t-[5px] bg-white px-5 py-3 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray">
              Inbox · 1 of 1
            </span>
          </div>
        </div>

        {/* Email envelope */}
        <div className="border-x border-black/5 bg-white px-5 py-4 shadow-sm">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-pink">
            From hello@stacey.de
          </p>
          <p className="mt-1 text-2xl font-black leading-tight">
            Welcome home, Anna
          </p>
          <p className="mt-1 font-mono text-[11px] text-gray">
            3 days until your move-in
          </p>
        </div>

        {/* Email body */}
        <div className="rounded-b-[5px] bg-[#FAFAFA] px-5 py-6 shadow-sm ring-1 ring-black/5">
          <p className="text-sm leading-relaxed text-black">
            Hi Anna,
          </p>
          <p className="mt-3 text-sm leading-relaxed text-black">
            See you Friday. Here&apos;s everything you need to walk in and
            feel at home.
          </p>

          {/* Detail rows */}
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between rounded-[3px] bg-white px-4 py-3 ring-1 ring-black/5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gray">
                Address
              </span>
              <span className="font-mono text-sm font-bold">
                Dorotheenstraße 3, 22301 Hamburg
              </span>
            </div>
            <div className="flex items-center justify-between rounded-[3px] bg-white px-4 py-3 ring-1 ring-black/5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gray">
                Check-in
              </span>
              <span className="font-mono text-sm font-bold">
                Fri 1 May from 16:00
              </span>
            </div>
            <div className="flex items-center justify-between rounded-[3px] bg-white px-4 py-3 ring-1 ring-black/5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gray">
                Your suite
              </span>
              <span className="font-mono text-sm font-bold">
                Mighty · Floor 2 · Room 04
              </span>
            </div>
            <div className="flex items-center justify-between rounded-[3px] bg-white px-4 py-3 ring-1 ring-black/5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gray">
                Your key
              </span>
              <span className="font-mono text-sm font-bold">
                Salto Mobile app
              </span>
            </div>
          </div>

          {/* Highlight tile */}
          <div className="mt-5 rounded-[3px] bg-pink px-4 py-3 text-center">
            <p className="font-mono text-xs font-black uppercase tracking-[0.15em] text-black">
              Friday: house dinner, 8 PM
            </p>
          </div>

          <p className="mt-5 text-sm leading-relaxed text-gray">
            Your community manager Lena will meet you in the lobby. We&apos;ve
            set up the Wi-Fi password and the Salto Mobile app credentials
            in your member dashboard. Drop us a reply if you&apos;re running
            late.
          </p>

          <p className="mt-4 text-sm leading-relaxed text-black">
            Welcome to STACEY.
          </p>
          <p className="mt-1 text-sm font-medium italic text-pink">
            — Team STACEY
          </p>
        </div>
      </div>
    </div>
  );
}
