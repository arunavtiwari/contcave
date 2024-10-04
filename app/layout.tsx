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
import { CategoryProvider } from "./context/CategoryContext";
import CustomAddonModal from "@/components/models/CustomAddonModal";

export const metadata = {
  title: "ContCave",
  description: "Marketplace for booking shoot spaces",
  icons: "https://i.ibb.co/4JdrGHS/Screenshot-2023-11-22-at-3-52-33-AM.png",
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
          <RentModal />
          <Navbar currentUser={currentUser} />
        </ClientOnly>
        <div className="pt-28">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
