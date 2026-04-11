import Link from "next/link";
import { ArrowRight } from "lucide-react";
import FadeIn from "@/components/ui/FadeIn";

const STEPS = [
  { num: "01", title: "Start exploring", desc: "Explore our coliving locations and sign up online to begin the booking process." },
  { num: "02", title: "Choose your Suite", desc: "We'll reach out and give you access to our booking platform. Pick your favorite suite." },
  { num: "03", title: "Make memories", desc: "You are now a member! Attend events, connect with other members and enjoy your time." },
];

export default function HowItWorksSection() {
  return (
    <section className="bg-[#FAFAFA] py-20">
      <FadeIn>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
            Your journey to <span className="italic font-light">home.</span>
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.num} className="relative overflow-hidden rounded-[5px] border-2 border-dashed border-[#D9D9D9] bg-white p-6">
                <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#FAFAFA]" />
                <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[#FAFAFA]" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-pink">Boarding Pass</p>
                <p className="mt-3 text-4xl font-black text-black/[0.07]">{s.num}</p>
                <h3 className="mt-2 text-base font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/move-in"
              className="inline-flex items-center gap-2 rounded-[5px] bg-black px-8 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-80"
            >
              Get Started <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
