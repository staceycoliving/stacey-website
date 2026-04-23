"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Footer logo — behaves like the navbar logo: on home, smooth-scrolls to
// top; on any other page, navigates to home. Kept as a small client leaf
// so the Footer itself can stay a Server Component.
export default function FooterLogo() {
  const pathname = usePathname();
  return (
    <Link
      href="/"
      aria-label="STACEY home"
      onClick={(e) => {
        if (pathname === "/") {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }}
      className="relative block h-8 w-28 transition-opacity hover:opacity-80"
    >
      <Image
        src="/images/stacey-logo-new-pink-001.webp"
        alt="STACEY"
        fill
        className="object-contain"
      />
    </Link>
  );
}
