import type { Metadata } from "next";
import Link from "next/link";
import { Check, Home, ArrowRight, X } from "lucide-react";
import Navbar from "@/components/layout/Navbar";

// Post-payment-setup confirmation page. Reached from Stripe redirect
// after Setup Intent capture; never indexable.
export const metadata: Metadata = {
  title: "Payment method saved",
  robots: { index: false, follow: false },
  alternates: { canonical: "/move-in/payment-setup-success" },
};

export default async function PaymentSetupSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const params = await searchParams;
  const cancelled = params.cancelled === "1";

  if (cancelled) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-white pt-24 pb-16 sm:pt-28">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                <X size={28} className="text-yellow-600" strokeWidth={3} />
              </div>
              <h1 className="mt-6 text-3xl font-bold sm:text-4xl">
                Setup <em className="font-bold italic">not completed</em>
              </h1>
              <p className="mx-auto mt-4 max-w-md text-base text-gray leading-relaxed">
                You haven&apos;t finished setting up your payment method yet. Your monthly rent can&apos;t be charged automatically until this is done.
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm text-gray">
                Please use the link in your confirmation email to try again, or contact us if you need help.
              </p>
              <Link
                href="/"
                className="mt-10 inline-flex items-center gap-2 rounded-[5px] bg-black px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-80"
              >
                <Home size={14} /> Back to homepage <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white pt-24 pb-16 sm:pt-28">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-black">
              <Check size={28} className="text-white" strokeWidth={3} />
            </div>
            <h1 className="mt-6 text-3xl font-bold sm:text-4xl">
              Payment method <em className="font-bold italic">saved!</em>
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base text-gray leading-relaxed">
              Your payment method has been securely saved. Your monthly rent will be automatically charged on the 1st of each month.
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm text-gray">
              You can update your payment method anytime by clicking the same setup link or contacting us.
            </p>
            <Link
              href="/"
              className="mt-10 inline-flex items-center gap-2 rounded-[5px] bg-black px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-80"
            >
              <Home size={14} /> Back to homepage <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
