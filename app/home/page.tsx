import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import EmptyState from "@/components/EmptyState";
import ListingCard from "@/components/listing/ListingCard";
import getCurrentUser from "../actions/getCurrentUser";
import getListings, { IListingsParams } from "../actions/getListings";
import Categories from "@/components/navbar/Categories";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Explore Studios for Rent | ContCave",
    description:
        "Browse and discover photography, video, and creative studio rentals across India. Book the perfect space for your next shoot with ContCave.",
    keywords: [
        "studio rental",
        "photography studio",
        "video shoot space",
        "creative studio",
        "ContCave listings",
        "studio spaces India",
    ],
    alternates: {
        canonical: "https://www.contcave.com/home",
    },
    openGraph: {
        title: "Explore Studios for Rent | ContCave",
        description:
            "Find and book verified studios across India for photography, video production, and events.",
        url: "https://www.contcave.com/home",
        siteName: "ContCave",
        type: "website",
        images: [
            {
                url: "https://www.contcave.com/images/logo/logo-dark.png",
                width: 1200,
                height: 630,
                alt: "ContCave Listings",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Explore Studios for Rent | ContCave",
        description:
            "Browse premium studios and book your perfect shoot location online with ContCave.",
        site: "@ContCave",
        creator: "@ContCave",
        images: ["https://www.contcave.com/images/logo/logo-dark.png"],
    },
};

interface HomeProps {
    searchParams: Promise<IListingsParams>;
}

export default async function Home(props: HomeProps) {
    const searchParams = await props.searchParams;
    const listing = await getListings(searchParams);
    const currentUser = await getCurrentUser();

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: listing.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: {
                "@type": "LocalBusiness",
                name: item.title,
                image: item.imageSrc || "https://www.contcave.com/default-image.jpg",
                description: item.description,
                url: `https://www.contcave.com/studio/${item.id}`,
                priceRange: `₹${item.price}`,
                address: {
                    "@type": "PostalAddress",
                    addressCountry: "IN",
                },
                openingHours: "Mo-Su 08:00-22:00"
            }
        }))
    };

    if (listing.length === 0) {
        return (
            <ClientOnly>
                <EmptyState showReset />
            </ClientOnly>
        );
    }

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <ClientOnly>
                <Container>
                    <Categories />
                    <div className="pb-24 pt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 overflow-x-hidden">
                        {listing.map((item) => (
                            <ListingCard key={item.id} data={item} currentUser={currentUser} />
                        ))}
                    </div>
                </Container>
            </ClientOnly>
        </>
    );
}
