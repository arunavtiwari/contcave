import "../styles/globals.css";
import { Montserrat } from "next/font/google";
import getCurrentUser from "./actions/getCurrentUser";
import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import LazyOverlaysHost from "./overlays/LazyOverlaysHost";

export const metadata = {
  metadataBase: new URL("https://www.contcave.com"),
  title: { default: "ContCave | Find the Perfect Shoot Space with Ease", template: "%s | ContCave" },
  description:
    "ContCave is a platform for booking creative shoot spaces, photography studios, and event rentals across India.",
  icons: { icon: "https://i.ibb.co/4JdrGHS/Screenshot-2023-11-22-at-3-52-33-AM.png" },
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

const font = Montserrat({ subsets: ["latin"], display: "swap" });

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="en">
      <body className={font.className}>
        <Navbar currentUser={currentUser} />

        <div className="min-h-[100vh] pt-[84px]">{children}</div>

        <Footer />
        <ScrollToTop />

        <LazyOverlaysHost />
      </body>
    </html>
  );
}
