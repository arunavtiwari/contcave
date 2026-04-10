// "use client";
// import { motion } from "framer-motion";
// import Image from "next/image";
// import { useSession } from "next-auth/react";
// import { useCallback } from "react";

// import useLoginModal from "@/hook/useLoginModal";
// import useOwnerRegisterModal from "@/hook/useOwnerRegisterModal";
// import useRentModal from "@/hook/useRentModal";
// import { SafeUser } from "@/types/user";

// interface CTAProps {
//   currentUser?: SafeUser | null;
// }

// const CTA = ({ currentUser }: CTAProps) => {
//   const { data: session } = useSession();
//   const loginModal = useLoginModal();
//   const ownerRegisterModal = useOwnerRegisterModal();
//   const rentModal = useRentModal();

//   const isLoggedIn = session ? !!session.user : !!currentUser;
//   const isOwner = session ? !!session.user?.is_owner : !!currentUser?.is_owner;

//   const handleListYourSpace = useCallback(() => {
//     if (!isLoggedIn) {
//       return loginModal.onOpen();
//     }
//     if (!isOwner) {
//       return ownerRegisterModal.onOpen();
//     }
//     rentModal.onOpen();
//   }, [isLoggedIn, isOwner, loginModal, ownerRegisterModal, rentModal]);

//   return (
//     <section className="px-4 py-20 md:px-8 lg:py-22.5 2xl:px-0">
//       <div className="relative z-1 mx-auto max-w-c-1390 rounded-lg bg-linear-to-t from-[#F8F9FF] to-[#DEE7FF] py-12.5 xl:py-17.5">
//         <Image
//           width={310}
//           height={299}
//           src="/images/shape/open_banner.png"
//           alt=""
//           aria-hidden="true"
//           className="absolute bottom-0 right-0 lg:-top-25 w-45 md:w-60 lg:w-77.5 -z-10 hidden xl:block"
//           sizes="(max-width: 768px) 180px, (max-width: 1024px) 240px, 310px"

//         />
//         <motion.div
//           variants={{
//             hidden: { opacity: 0, y: -20 },
//             visible: { opacity: 1, y: 0 },
//           }}
//           initial="hidden"
//           whileInView="visible"
//           transition={{ duration: 1, delay: 0.1 }}
//           viewport={{ once: true }}
//           className="animate_top mx-auto mb-12.5 px-4 text-center md:w-4/5 md:px-0 lg:mb-17.5 lg:w-2/3 xl:w-1/2"
//         >
//           <h2 className="mb-4 text-3xl font-bold text-black xl:text-sectiontitle3">
//             List Your Space with Us & Boost Your Visibility
//           </h2>
//           <p className="mx-auto lg:w-11/12">
//             Are you a property owner with a space to rent hourly? Join our platform to showcase your property and connect with potential clients. Increase your visibility and attract more bookings effortlessly.
//           </p>
//         </motion.div>

//         <div className="flex justify-center">
//           <button
//             onClick={handleListYourSpace}
//             className="rounded-full bg-black px-6 py-2.5 text-white hover:scale-105 duration-300 cursor-pointer"
//             aria-label="List your space"
//           >
//             List Your Space
//           </button>
//         </div>
//       </div>
//     </section>
//   );
// };

// export default CTA;

"use client";
import { motion } from "framer-motion";
import Link from "next/link";

const CTA = () => {
  return (
    <section className="px-4 py-12 md:px-8 lg:py-16 2xl:px-0">
      <div
        className="relative mx-auto max-w-c-1390 overflow-hidden rounded-lg"
        style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(17,17,17,0.08)" }}
      >
        {/* Black accent */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ backgroundColor: "#111111" }}
        />

        {/* Dot grid texture */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(17,17,17,0.05) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative z-10 flex flex-col gap-10 px-6 py-12 md:px-10 lg:flex-row lg:items-center lg:gap-20 xl:px-20 xl:py-20">

          {/* Left — headline + CTA */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0 } }}
            initial="hidden"
            whileInView="visible"
            transition={{ duration: 0.8, delay: 0.1 }}
            viewport={{ once: true }}
            className="lg:w-1/2"
          >
            <p
              className="mb-4 text-xs font-semibold uppercase tracking-[0.22em]"
              style={{ color: "#111111" }}
            >
              For studio owners
            </p>

            <h2
              className="mb-6"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "clamp(2rem, 3.2vw, 2.8rem)",
                fontWeight: 700,
                color: "#111111",
                lineHeight: 1.15,
              }}
            >
              Your studio deserves{" "}
              <em style={{ color: "#111111" }}>serious creators.</em>
            </h2>

            <p
              className="mb-8 text-base leading-relaxed"
              style={{ color: "#555555" }}
            >
              Connect your space with active creators and brands. Get consistent, high-quality bookings without the back-and-forth.
            </p>

            <Link
              href="/home"
              aria-label="List your studio on ContCave"
              className="inline-block rounded-full px-7 py-3 text-base font-semibold transition-transform duration-300 hover:scale-105"
              style={{ backgroundColor: "#111111", color: "#FFFFFF" }}
            >
              List your studio
            </Link>

            <p
              className="mt-4 text-xs"
              style={{ color: "rgba(17,17,17,0.4)" }}
            >
              No listing fee. Commission only on confirmed bookings.
            </p>
          </motion.div>

          {/* Right — benefit list */}
          <motion.div
            variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0 } }}
            initial="hidden"
            whileInView="visible"
            transition={{ duration: 0.8, delay: 0.25 }}
            viewport={{ once: true }}
            className="lg:w-1/2"
          >
            {[
              {
                num: "01",
                title: "Verified clients",
                body: "No wasted enquiries, just verified creators.",
              },
              {
                num: "02",
                title: "Properly found",
                body: "Ranked by shoot type, equipment, and capacity.",
              },
              {
                num: "03",
                title: "Consistent demand",
                body: "Stop relying exclusively on referrals.",
              },
              {
                num: "04",
                title: "Free to list",
                body: "Commission on confirmed bookings only.",
              },
            ].map((item, i) => (
              <div
                key={item.num}
                className="flex gap-5 py-5"
                style={{
                  borderTop: i === 0 ? "1px solid rgba(17,17,17,0.07)" : "none",
                  borderBottom: "1px solid rgba(17,17,17,0.07)",
                }}
              >
                <span
                  className="w-6 flex-shrink-0 text-sm font-bold"
                  style={{ color: "#111111", marginTop: "1px" }}
                >
                  {item.num}
                </span>
                <div>
                  <p className="mb-1 text-sm font-medium" style={{ color: "#111111" }}>
                    {item.title}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "#555555" }}>
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default CTA;