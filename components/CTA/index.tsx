"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useCallback } from "react";

import useLoginModal from "@/hook/useLoginModal";
import useOwnerRegisterModal from "@/hook/useOwnerRegisterModal";
import useRentModal from "@/hook/useRentModal";
import { SafeUser } from "@/types/user";

interface CTAProps {
  currentUser?: SafeUser | null;
}

const CTA = ({ currentUser }: CTAProps) => {
  const { data: session } = useSession();
  const loginModal = useLoginModal();
  const ownerRegisterModal = useOwnerRegisterModal();
  const rentModal = useRentModal();

  const isLoggedIn = session ? !!session.user : !!currentUser;
  const isOwner = session ? !!session.user?.is_owner : !!currentUser?.is_owner;

  const handleListYourSpace = useCallback(() => {
    if (!isLoggedIn) {
      return loginModal.onOpen();
    }
    if (!isOwner) {
      return ownerRegisterModal.onOpen();
    }
    rentModal.onOpen();
  }, [isLoggedIn, isOwner, loginModal, ownerRegisterModal, rentModal]);

  return (
    <section className="px-4 py-20 md:px-8 lg:py-22.5 2xl:px-0">
      <div className="relative z-1 mx-auto max-w-c-1390 rounded-lg bg-linear-to-t from-[#F8F9FF] to-[#DEE7FF] py-12.5 xl:py-17.5">
        <Image
          width={310}
          height={299}
          src="/images/shape/open_banner.png"
          alt=""
          aria-hidden="true"
          className="absolute bottom-0 right-0 lg:-top-25 w-45 md:w-60 lg:w-77.5 -z-10 hidden xl:block"
          sizes="(max-width: 768px) 180px, (max-width: 1024px) 240px, 310px"

        />
        <motion.div
          variants={{
            hidden: { opacity: 0, y: -20 },
            visible: { opacity: 1, y: 0 },
          }}
          initial="hidden"
          whileInView="visible"
          transition={{ duration: 1, delay: 0.1 }}
          viewport={{ once: true }}
          className="animate_top mx-auto mb-12.5 px-4 text-center md:w-4/5 md:px-0 lg:mb-17.5 lg:w-2/3 xl:w-1/2"
        >
          <h2 className="mb-4 text-3xl font-bold text-black xl:text-sectiontitle3">
            List Your Space with Us & Boost Your Visibility
          </h2>
          <p className="mx-auto lg:w-11/12">
            Are you a property owner with a space to rent hourly? Join our platform to showcase your property and connect with potential clients. Increase your visibility and attract more bookings effortlessly.
          </p>
        </motion.div>

        <div className="flex justify-center">
          <button
            onClick={handleListYourSpace}
            className="rounded-full bg-black px-6 py-2.5 text-white hover:scale-105 duration-300 cursor-pointer"
            aria-label="List your space"
          >
            List Your Space
          </button>
        </div>
      </div>
    </section>
  );
};

export default CTA;
