"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sofa,
  Users,
  Calendar,
  Package,
  Sparkles,
  Wifi,
  ArrowLeftRight,
  WashingMachine,
  Wrench,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { features } from "@/lib/data";

const iconMap: Record<string, React.ReactNode> = {
  sofa: <Sofa size={28} />,
  users: <Users size={28} />,
  calendar: <Calendar size={28} />,
  package: <Package size={28} />,
  sparkles: <Sparkles size={28} />,
  wifi: <Wifi size={28} />,
  arrowLeftRight: <ArrowLeftRight size={28} />,
  washingMachine: <WashingMachine size={28} />,
  wrench: <Wrench size={28} />,
};

export default function WhyStaceyPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1A1A1A] via-[#2a2a2a] to-[#1A1A1A] pb-16 pt-28">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="font-display text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            Who would want to live their <span className="italic font-light text-pink">life alone?</span>
          </h1>
          <p className="mt-4 text-lg text-white/60">
            Coliving for young professionals in Hamburg, Berlin and Vallendar.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Our <span className="italic font-light">mission</span>
          </h2>
          <p className="mt-4 leading-relaxed text-gray">
            STACEY members save around €550 every month compared to a traditional studio
            apartment — and gain friends for life in return. For us it is not about the
            money. It is all about creating an international community of young
            professionals who share a home, a philosophy, and plenty of good evenings.
          </p>
          <p className="mt-4 leading-relaxed text-gray">
            Living at STACEY means you&apos;re always invited and never obligated. Join the
            community dinner or close your door — both are perfectly fine. Move-in takes
            30 minutes. All you bring is your suitcase.
          </p>
        </div>
      </section>

      {/* What you get */}
      <section className="bg-background py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            What you <span className="italic font-light">get</span>
          </h2>
          <div className="mt-8 space-y-6">
            {[
              {
                title: "Private & Shared Spaces",
                text: "Your own furnished bedroom — bedding included — plus generous common areas: living rooms, work zones and kitchens stocked with essentials. Move-in ready from day one.",
              },
              {
                title: "All Services Included",
                text: "Weekly professional cleaning of common areas, WiFi, on-site WeWash laundry, plus repair and maintenance handled by our team. One bill covers the rental essentials — laundry and the German broadcasting fee are handled separately.",
              },
              {
                title: "A Real Community",
                text: "Every location has a Community Manager organizing regular events — potlucks, movie nights, book clubs. Slack channels connect members across all our cities. And you can transfer between STACEY locations whenever life takes you somewhere new.",
              },
            ].map((value) => (
              <div key={value.title} className="rounded-[5px] bg-white p-6 shadow-sm">
                <h3 className="font-medium">{value.title}</h3>
                <p className="mt-2 text-sm text-gray">{value.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            What makes STACEY special
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl bg-background p-6 text-left shadow-sm"
              >
                <div className="text-pink">{iconMap[f.icon]}</div>
                <h3 className="mt-3 font-medium">{f.title}</h3>
                <p className="mt-1 text-sm text-gray">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-pink py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold text-white">
            Become part of STACEY
          </h2>
          <p className="mt-3 text-white/80">
            Find your new home in Hamburg, Berlin, or Vallendar.
          </p>
          <Link
            href="/move-in"
            className="mt-8 inline-block rounded-full bg-white px-8 py-3 text-base font-medium text-pink transition-transform hover:scale-105"
          >
            Join us
          </Link>
        </div>
      </section>

      <Footer />
    </motion.div>
  );
}
