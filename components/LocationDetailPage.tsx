"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
  Users,
  Clock,
  Home,
  Wifi,
  Sparkles,
  CreditCard,
  Bed,
  Sofa,
  Wrench,
  MessageSquare,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RoomCard from "@/components/ui/RoomCard";
import LocationCard from "@/components/ui/LocationCard";
import Badge from "@/components/ui/Badge";
import type { Location } from "@/lib/data";
import { getNearbyLocations } from "@/lib/data";

const amenities = [
  { icon: <CreditCard size={20} />, title: "All costs included", desc: "Bills, internet, cleaning included" },
  { icon: <MessageSquare size={20} />, title: "Support team", desc: "Slack support for all members" },
  { icon: <Wifi size={20} />, title: "Included Internet", desc: "Fast Wi-Fi throughout the entire location" },
  { icon: <CreditCard size={20} />, title: "Monthly payment", desc: "Convenient monthly bank transfer" },
  { icon: <Bed size={20} />, title: "Private Bedroom", desc: "Your own furnished room" },
  { icon: <Sofa size={20} />, title: "Common Spaces", desc: "Lounge, kitchen, coworking" },
  { icon: <Sparkles size={20} />, title: "Weekly cleaning", desc: "Professional cleaning every week" },
  { icon: <Home size={20} />, title: "Fully furnished suites", desc: "Completely furnished suites" },
];

export default function LocationDetailPage({
  location,
  cityLabel,
}: {
  location: Location;
  cityLabel: string;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const nearbyLocations = getNearbyLocations(location);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Navbar />

      {/* Breadcrumb */}
      <div className="bg-white pt-24 pb-4">
        <div className="mx-auto max-w-7xl px-4">
          <nav className="flex items-center gap-2 text-sm text-gray">
            <Link href={`/${location.city}`} className="hover:text-pink">
              All Locations
            </Link>
            <span>/</span>
            <Link href={`/${location.city}`} className="hover:text-pink">
              {cityLabel}
            </Link>
            <span>/</span>
            <span className="text-black">{location.name}</span>
          </nav>
        </div>
      </div>

      {/* Image Gallery */}
      <section className="bg-white pb-8">
        <div className="mx-auto max-w-7xl px-4">
          {/* Main Image */}
          <div
            className="relative aspect-[16/7] cursor-pointer overflow-hidden rounded-2xl"
            onClick={() => openLightbox(0)}
          >
            <Image
              src={location.images[0]}
              alt={`STACEY ${location.name}`}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          </div>

          {/* Thumbnails */}
          {location.images.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
              {location.images.slice(1).map((img, i) => (
                <div
                  key={i}
                  className="relative aspect-[4/3] w-32 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg"
                  onClick={() => openLightbox(i + 1)}
                >
                  <Image
                    src={img}
                    alt={`${location.name} ${i + 2}`}
                    fill
                    className="object-cover transition-transform hover:scale-105"
                    sizes="128px"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              className="absolute right-4 top-4 text-white/70 hover:text-white"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close"
            >
              <X size={32} />
            </button>
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-[5px] bg-white/10 p-2 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(
                  (prev) => (prev - 1 + location.images.length) % location.images.length
                );
              }}
              aria-label="Previous"
            >
              <ChevronLeft size={24} />
            </button>
            <div
              className="relative h-[80vh] w-full max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={location.images[lightboxIndex]}
                alt={`${location.name} ${lightboxIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
              />
            </div>
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-[5px] bg-white/10 p-2 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(
                  (prev) => (prev + 1) % location.images.length
                );
              }}
              aria-label="Next"
            >
              <ChevronRight size={24} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Description */}
      <section className="bg-white py-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-3xl">
            <h1 className="font-display text-3xl font-bold sm:text-4xl lg:text-5xl">
              STACEY {location.name}
            </h1>
            <p className="mt-2 flex items-center gap-1 text-gray">
              <MapPin size={16} /> {location.address}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <Badge stayType={location.stayType}>
                {location.stayType === "SHORT"
                  ? "Short Stay (< 180 nights)"
                  : "Long Stay (3+ months)"}
              </Badge>
              <Badge variant="neutral">
                <span className="flex items-center gap-1">
                  <Users size={12} /> {location.roomiesPerApartment} Roomies
                </span>
              </Badge>
              <Badge variant="neutral">
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {location.neighborhood}
                </span>
              </Badge>
            </div>

            <p className="mt-6 leading-relaxed text-gray">
              {location.description}
            </p>

            <Link
              href="/move-in"
              className="mt-6 inline-block rounded-[5px] bg-pink px-8 py-3 text-sm font-medium text-black transition-transform hover:scale-105"
            >
              Sign up!
            </Link>
          </div>
        </div>
      </section>

      {/* Suites */}
      <section className="bg-background py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Suites</h2>
          <p className="mt-1 text-sm text-gray">
            Choose your suite — from &euro;{location.priceFrom} / month
          </p>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {location.rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        </div>
      </section>

      {/* Community Space */}
      {location.communitySpaceDescription && (
        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Community Space
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-gray">
              {location.communitySpaceDescription}
            </p>
            {location.images.length > 1 && (
              <div className="relative mt-6 aspect-[16/7] overflow-hidden rounded-2xl">
                <Image
                  src={location.images[Math.min(1, location.images.length - 1)]}
                  alt="Community Space"
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Neighbourhood */}
      <section className="bg-background py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            The Neighbourhood: {location.neighborhood}
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-gray">
            {location.neighborhoodDescription}
          </p>
        </div>
      </section>

      {/* Amenities Grid */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            What&apos;s included
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {amenities.map((a) => (
              <div
                key={a.title}
                className="flex items-start gap-3 rounded-xl bg-background p-4"
              >
                <div className="mt-0.5 text-pink">{a.icon}</div>
                <div>
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-gray">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Further Information */}
      <section className="border-t border-lightgray bg-white py-12">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="font-display text-2xl font-bold">
            Further Information
          </h2>
          <div className="mt-6 flex flex-wrap gap-8">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-pink" />
              <div>
                <p className="text-sm font-medium">Check-in: 4:00 PM</p>
                <p className="text-sm font-medium">Check-out: 11:00 AM</p>
              </div>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-xs text-gray">
            Please note that structural variations may occur in European buildings.
            The images shown are representative and your actual room may differ
            in details.
          </p>
        </div>
      </section>

      {/* Nearby Locations */}
      {nearbyLocations.length > 0 && (
        <section className="bg-background py-16">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              STACEY Locations Nearby
            </h2>
            <div className="mt-8 flex gap-6 overflow-x-auto pb-4">
              {nearbyLocations.map((loc) => (
                <LocationCard key={loc.slug} location={loc} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Community Manager */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col items-center gap-6 rounded-2xl bg-background p-8 sm:flex-row sm:items-start">
            <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-full">
              <Image
                src={location.communityManager.image}
                alt={location.communityManager.name}
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold">
                Hi, I&apos;m {location.communityManager.name}!
              </h3>
              <p className="mt-1 text-sm text-gray">
                I'm your Community Manager and I take care of everything you need.
                From events to repairs — I'm here for you.
              </p>
              <a
                href={`mailto:${location.communityManager.email}`}
                className="mt-3 inline-block text-sm font-medium text-pink hover:underline"
              >
                Ask me anything at {location.communityManager.email}
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </motion.div>
  );
}
