import Link from "next/link";
import { ArrowRight, ArrowLeftRight, CreditCard, Sofa, Sparkles, Users, Wifi, Wrench } from "lucide-react";
import FadeIn from "@/components/ui/FadeIn";

const ITEMS = [
  { icon: <Sofa size={18} />, text: "Fully furnished private suite" },
  { icon: <CreditCard size={18} />, text: "Utilities included" },
  { icon: <Wifi size={18} />, text: "Internet included" },
  { icon: <Sparkles size={18} />, text: "Weekly professional cleaning" },
  { icon: <Users size={18} />, text: "Community events & shared spaces" },
  { icon: <ArrowLeftRight size={18} />, text: "Transfer between locations" },
  { icon: <Wrench size={18} />, text: "Maintenance & repair service" },
];

export default function FeaturesSection() {
  return (
    <section className="bg-[#FAFAFA] py-20">
      <FadeIn>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 sm:grid-cols-2">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Almost everything<br /><span className="italic font-light">included.</span>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-gray">
                One price. No surprises. Move in with just a suitcase.
              </p>
              <Link
                href="/move-in"
                className="mt-6 inline-flex items-center gap-2 rounded-[5px] bg-black px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-80"
              >
                Find your room <ArrowRight size={14} />
              </Link>
            </div>
            <div className="space-y-2.5">
              {ITEMS.map((f) => (
                <div key={f.text} className="flex items-center gap-3 rounded-[5px] bg-white px-4 py-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-pink/20 text-black">{f.icon}</span>
                  <p className="text-sm font-medium">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
