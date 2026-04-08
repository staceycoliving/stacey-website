"use client";

import { motion } from "framer-motion";
import { Building, Users, Globe, Clock } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const benefits = [
  {
    icon: <Building size={28} />,
    title: "Move-in ready",
    desc: "Fully furnished apartments — your employees can move in right away without worrying about furniture or contracts.",
  },
  {
    icon: <Users size={28} />,
    title: "Community included",
    desc: "Your employees quickly connect through our events and community spaces.",
  },
  {
    icon: <Globe size={28} />,
    title: "Locations across Germany",
    desc: "Hamburg, Berlin, Vallendar — we have the right location for every assignment.",
  },
  {
    icon: <Clock size={28} />,
    title: "Flexible lease terms",
    desc: "From short-term stays to long-term solutions — we adapt to your needs.",
  },
];

export default function CompaniesPage() {
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
            Housing for <span className="text-pink">Companies</span>
          </h1>
          <p className="mt-4 text-lg text-white/60">
            Give your employees a home in their new city.
          </p>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">
            Benefits for companies
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
            Get in touch
          </h2>
          <p className="mt-3 text-white/80">
            We'd be happy to create a customized offer for you.
          </p>
          <a
            href="mailto:companies@stacey.de"
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
