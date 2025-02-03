import ClientOnly from "@/components/ClientOnly";
import Footer from "@/components/Footer";
import ToastContainerBar from "@/components/ToastContainerBar";
import LoginModal from "@/components/models/LoginModal";
import RegisterModal from "@/components/models/RegisterModal";
import RentModal from "@/components/models/RentModal";
import SearchModal from "@/components/models/SearchModal";
import Navbar from "@/components/navbar/Navbar";
import { Montserrat } from "next/font/google";
import "../styles/globals.css";
import getCurrentUser from "./actions/getCurrentUser";
// import { CategoryProvider } from "./context/CategoryContext";
// import CustomAddonModal from "@/components/models/CustomAddonModal";
import ScrollToTop from "@/components/ScrollToTop";
import CookieConsent from "@/components/CookieConsentBanner";
import OwnerRegisterModal from "@/components/models/OwnerRegisterModal";

export const metadata = {
  title: "ContCave | Find the Perfect Shoot Space with Ease",
  description: "Discover and book the ideal shoot space for your next project on ContCave, the leading marketplace for creative space rentals.",
  icons: "https://i.ibb.co/4JdrGHS/Screenshot-2023-11-22-at-3-52-33-AM.png",
  keywords: [
    "studio booking",
    "photography spaces",
    "event spaces",
    "contcave",
    "shoot space rental",
    "creative space booking",
    "photography studio rental",
    "video production space",
    "book studio",
  ],
  authors: [{ name: "ContCave" }],
  openGraph: {
    title: "ContCave | Find the Perfect Shoot Space with Ease",
    description: "Discover and book the ideal shoot space for your next project on ContCave, the leading marketplace for creative space rentals.",
    url: "https://www.contcave.com",
    type: "website",
    images: "/public/images/logo/logo-dark.png",
  },
  twitter: {
    card: "summary_large_image",
    title: "ContCave | Find the Perfect Shoot Space with Ease",
    description: "Discover and book the ideal shoot space for your next project on ContCave, the leading marketplace for creative space rentals.",
    images: "/public/images/logo/logo-dark.png",
  },
};

const font = Montserrat({
  subsets: ["latin"],
});

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
        <div className="pt-[85px]">{children}</div>
        <ScrollToTop />
        <Footer />

      </body>
    </html>
  );
}
