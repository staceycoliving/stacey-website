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
            Why <span className="text-pink">STACEY</span>?
          </h1>
          <p className="mt-4 text-lg text-white/60">
            More than just a room. A community, a way of life.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Our Mission
          </h2>
          <p className="mt-4 leading-relaxed text-gray">
            STACEY was founded in 2019 in Hamburg with a simple idea: make city living better.
            We believe that a home is more than four walls — it's the people you share it with.
            That's why we create places where strangers become friends.
          </p>
          <p className="mt-4 leading-relaxed text-gray">
            From our first apartment in Winterhude, we've since expanded to Hamburg, Berlin,
            and Vallendar. Each location is managed by a Community Manager who organizes events,
            helps with any issues, and makes sure you settle in quickly.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="bg-background py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Our Values
          </h2>
          <div className="mt-8 space-y-6">
            {[
              {
                title: "Community First",
                text: "Everything we do revolves around our community. From choosing locations to designing common spaces — we always think of people first.",
              },
              {
                title: "Simplicity",
                text: "One price, everything included. No hidden costs, no paperwork. We make moving in as easy as possible.",
              },
              {
                title: "Quality",
                text: "We prioritize quality in everything — from furniture to cleaning to events. Because you deserve it.",
              },
            ].map((value) => (
              <div key={value.title} className="rounded-2xl bg-white p-6 shadow-sm">
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
