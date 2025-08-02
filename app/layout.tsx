import ClientOnly from "@/components/ClientOnly";
import Footer from "@/components/Footer";
import ToastContainerBar from "@/components/ToastContainerBar";
import LoginModal from "@/components/modals/LoginModal";
import RegisterModal from "@/components/modals/RegisterModal";
import RentModal from "@/components/modals/RentModal";
import SearchModal from "@/components/modals/SearchModal";
import Navbar from "@/components/navbar/Navbar";
import { Montserrat } from "next/font/google";
import "../styles/globals.css";
import getCurrentUser from "./actions/getCurrentUser";
import ScrollToTop from "@/components/ScrollToTop";
import CookieConsent from "@/components/CookieConsentBanner";
import OwnerRegisterModal from "@/components/modals/OwnerRegisterModal";

export const metadata = {
  metadataBase: new URL("https://www.contcave.com"),
  title: {
    default: "ContCave | Find the Perfect Shoot Space with Ease",
    template: "%s | ContCave",
  },
  description:
    "ContCave is a platform for booking creative shoot spaces, photography studios, and event rentals across India.",
  icons: {
    icon: "https://i.ibb.co/4JdrGHS/Screenshot-2023-11-22-at-3-52-33-AM.png",
  },
  keywords: [
    "studio booking",
    "creative studio rental",
    "event spaces",
    "shoot location",
    "photography studio",
    "video shoot location",
    "ContCave",
  ],
  authors: [{ name: "ContCave" }],
  robots: "index, follow",
};

const font = Montserrat({ subsets: ["latin"] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="en">
      <body className={font.className}>
        <ClientOnly>
          <ToastContainerBar />
          <SearchModal />
          <RegisterModal />
          <LoginModal />
          <OwnerRegisterModal />
          <RentModal />
          <Navbar currentUser={currentUser} />
          <CookieConsent />
        </ClientOnly>
        <div className="min-h-[100vh] pt-[84px]">{children}</div>
        <ScrollToTop />
        <Footer />
      </body>
    </html>
  );
}
