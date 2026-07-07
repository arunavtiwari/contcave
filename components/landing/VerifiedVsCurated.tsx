"use client";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { FaCheckCircle, FaShieldAlt } from "react-icons/fa";
import { FiCheck } from "react-icons/fi";
import { IoInformationCircleOutline } from "react-icons/io5";

import Container from "@/components/Container";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import Pill from "@/components/ui/Pill";
import SectionHeader from "@/components/ui/SectionHeader";
import useUIStore from "@/hooks/useUIStore";
import { SafeUser } from "@/types/user";

interface VerifiedVsCuratedProps {
  currentUser?: SafeUser | null;
}

const CURATED_POINTS = [
  "Info sourced from Google, websites & social profiles",
  "Basic details, amenities & indicative pricing",
  "Standard visibility & ranking in search",
  "Discoverable, but not owner-confirmed",
  "Info may be outdated over time",
];

const VERIFIED_POINTS = [
  "Confirmed directly by the studio owner",
  "Full details, pricing & media — kept up to date",
  "Priority placement in search results",
  "Verified badge that builds customer trust",
  "More enquiries, bookings & early platform perks",
];

const VerifiedVsCurated: React.FC<VerifiedVsCuratedProps> = ({ currentUser }) => {
  const router = useRouter();
  const uiStore = useUIStore();

  const handleGetVerified = useCallback(() => {
    if (currentUser) {
      router.push("/dashboard/profile");
    } else {
      uiStore.onOpen("login");
    }
  }, [currentUser, router, uiStore]);

  return (
    <section id="verified-vs-curated" className="py-section bg-background">
      <Container>
        <SectionHeader
          badge="Trust & Transparency"
          title="Curated vs. Verified listings"
          description="Some studios are actively managed by their owners. Others we've researched ourselves so you can discover them sooner. Here's what sets them apart."
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="flex flex-col rounded-2xl border border-border bg-background p-6 lg:p-8"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                <IoInformationCircleOutline size={20} className="text-warning" />
              </div>
              <Pill label="Curated" variant="curated-button" size="sm" />
            </div>

            <Heading
              title="Discovered by ContCave"
              variant="h4"
              subtitle="Compiled from publicly available information."
            />

            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {CURATED_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <FiCheck size={16} className="mt-0.5 shrink-0 text-muted-foreground/60" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <p className="mt-8 text-xs text-muted-foreground/60 italic">
              Pricing & availability shown are indicative until confirmed by the studio.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            viewport={{ once: true }}
            className="relative flex flex-col rounded-2xl border-2 border-success/30 bg-success/3 p-6 shadow-sm lg:p-8"
          >
            <span className="absolute -top-3 left-6 rounded-full bg-success px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-background">
              Recommended
            </span>

            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                <FaShieldAlt size={18} className="text-success" />
              </div>
              <Pill label="Verified" variant="verified-button" size="sm" />
            </div>

            <Heading
              title="Confirmed by the studio"
              variant="h4"
              subtitle="Claimed, managed & kept up to date by the owner."
            />

            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {VERIFIED_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-foreground/80">
                  <FaCheckCircle size={15} className="mt-0.5 shrink-0 text-success" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <Button
              label="Get Verified"
              onClick={handleGetVerified}
              variant="success"
              rounded
              fit
              className="mt-8"
            />
            <p className="mt-3 text-center text-xs text-muted-foreground/60 italic">
              Takes less than 5 minutes.
            </p>
          </motion.div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/70">
          Own a studio listed as Curated? Claim it and get Verified to unlock full visibility.
        </p>
      </Container>
    </section>
  );
};

export default VerifiedVsCurated;
