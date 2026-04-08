"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sofa, Sparkles, Wifi, WashingMachine } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import LocationCard from "@/components/ui/LocationCard";
import type { Location } from "@/lib/data";

const cityDescriptions: Record<string, { headline: string; text: string; stats: { locations: number; members: number; roomies: string } }> = {
  hamburg: {
    headline: "IN HAMBURG WE SAY MOIN!",
    text: "Hamburg is our home — this is where it all started. From Winterhude to St. Pauli, we offer coliving in the most beautiful corners of the Hanseatic city. Whether by the Alster, in the city center, or in the green west — at STACEY you'll find your home in Hamburg.",
    stats: { locations: 7, members: 130, roomies: "1-3" },
  },
  berlin: {
    headline: "BERLIN, WE'RE HERE!",
    text: "The German capital is diverse, creative, and full of opportunities. Our location in Berlin Mitte puts you right in the middle of the action — with views of the Spree and surrounded by culture, nightlife, and history.",
    stats: { locations: 1, members: 25, roomies: "2-3" },
  },
  vallendar: {
    headline: "WELCOME TO VALLENDAR!",
    text: "Vallendar on the Rhine is the home of WHU and our community of students and young professionals. Located right by the campus, we offer the perfect coliving experience between university and nature.",
    stats: { locations: 1, members: 20, roomies: "2-4" },
  },
};

const allCities = [
  { slug: "hamburg", label: "Hamburg" },
  { slug: "berlin", label: "Berlin" },
  { slug: "vallendar", label: "Vallendar" },
];

const quickFeatures = [
  { icon: <Sofa size={20} />, label: "Furniture" },
  { icon: <Sparkles size={20} />, label: "Weekly Cleaning" },
  { icon: <Wifi size={20} />, label: "Free Wifi" },
  { icon: <WashingMachine size={20} />, label: "On-site Laundry" },
];

export default function CityPage({
  city,
  cityLocations,
}: {
  city: string;
  cityLocations: Location[];
}) {
  const info = cityDescriptions[city];
  const cityLabel = city.charAt(0).toUpperCase() + city.slice(1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1A1A1A] via-[#2a2a2a] to-[#1A1A1A] pb-12 pt-28">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h1 className="font-display text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            Coliving in <span className="text-pink">{cityLabel}</span>
          </h1>

          {/* City Switcher */}
          <div className="mt-8 flex items-center justify-center gap-6">
            {allCities.map((c) => (
              <Link
                key={c.slug}
                href={`/${c.slug}`}
                className={`text-sm font-medium transition-colors ${
                  c.slug === city
                    ? "text-pink underline underline-offset-4"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Features */}
      <section className="border-b border-lightgray bg-white py-6">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-8 px-4">
          {quickFeatures.map((f) => (
            <div key={f.label} className="flex items-center gap-2 text-sm text-gray">
              <span className="text-pink">{f.icon}</span>
              {f.label}
            </div>
          ))}
        </div>
      </section>

      {/* Description */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            {info.headline}
          </h2>
          <p className="mt-4 leading-relaxed text-gray">{info.text}</p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-lightgray bg-background py-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-10 px-4 text-center">
          <div>
            <span className="text-2xl font-bold text-pink">{info.stats.locations}</span>
            <p className="text-xs text-gray">Locations</p>
          </div>
          <div>
            <span className="text-2xl font-bold text-pink">{info.stats.members}</span>
            <p className="text-xs text-gray">Members</p>
          </div>
          <div>
            <span className="text-2xl font-bold text-pink">{info.stats.roomies}</span>
            <p className="text-xs text-gray">Roomies per Apartment</p>
          </div>
        </div>
      </section>

      {/* Locations Grid */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cityLocations.map((loc) => (
              <LocationCard key={loc.slug} location={loc} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </motion.div>
  );
}
