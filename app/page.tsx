import Blog from "@/components/Blog";
import ClientOnly from "@/components/ClientOnly";
import Contact from "@/components/Contact";
// import Container from "@/components/Container";
import CTA from "@/components/CTA";
import Cover from "@/components/Cover";
// import EmptyState from "@/components/EmptyState";
import FAQ from "@/components/FAQ";
import Feature from "@/components/Features";
import FeaturesTab from "@/components/FeaturesTab";
import FunFact from "@/components/FunFact";
import Hero from "@/components/Hero";
// import ListingCard from "@/components/listing/ListingCard";
// import getCurrentUser from "./actions/getCurrentUser";
// import getListings, { IListingsParams } from "./actions/getListings";
import "./landing.css";
// interface HomeProps {
//   searchParams: IListingsParams;
// }

export default async function Home() {
  // const listing = await getListings(searchParams);
  // const currentUser = await getCurrentUser();
  // if (listing.length === 0) {
  //   return (
  //     <ClientOnly>
  //       <EmptyState showReset />
  //     </ClientOnly>
  //   );
  // }

  return (
    <ClientOnly>
      <main>
        <Hero />
        <Feature />
        <FeaturesTab />
        <FunFact />
        <FAQ />
        <CTA />
        <Cover />
        {/* <Contact /> */}
        {/* <Blog/> */}
      </main>
    </ClientOnly>
  );
}
