"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, TrendingUp, Shield, Handshake } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const benefits = [
  {
    icon: <TrendingUp size={28} />,
    title: "Reliable rental income",
    desc: "Long-term lease agreements with STACEY as a professional tenant. No vacancy risks.",
  },
  {
    icon: <Shield size={28} />,
    title: "Professional management",
    desc: "We take care of everything — from furnishing to cleaning to tenant support.",
  },
  {
    icon: <Building2 size={28} />,
    title: "Value appreciation",
    desc: "Through our high-quality furnishing and regular maintenance, we increase the value of your property.",
  },
  {
    icon: <Handshake size={28} />,
    title: "True partnership",
    desc: "Transparent communication, fair terms, and a long-term partnership on equal footing.",
  },
];

export default function RealEstatePartnersPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Navbar />

      <section className="bg-gradient-to-br from-[#1A1A1A] via-[#2a2a2a] to-[#1A1A1A] pb-16 pt-28">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="font-display text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            Real Estate <span className="text-pink">Partners</span>
          </h1>
          <p className="mt-4 text-lg text-white/60">
            Rent your property to STACEY — professional, reliable, long-term.
          </p>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">
            Your benefits as a partner
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-2xl bg-background p-6">
                <div className="text-pink">{b.icon}</div>
                <h3 className="mt-3 font-medium">{b.title}</h3>
                <p className="mt-1 text-sm text-gray">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-pink py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold text-white">
            Let's talk
          </h2>
          <p className="mt-3 text-white/80">
            Contact us for a no-obligation conversation about your property.
          </p>
          <a
            href="mailto:partners@stacey.de"
            className="mt-8 inline-block rounded-full bg-white px-8 py-3 text-base font-medium text-pink transition-transform hover:scale-105"
          >
            Get in touch
          </a>
        </div>
      </section>

      <Footer />
    </motion.div>
  );
}
