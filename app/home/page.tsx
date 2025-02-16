import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import EmptyState from "@/components/EmptyState";
import ListingCard from "@/components/listing/ListingCard";
import getCurrentUser from "../actions/getCurrentUser";
import getListings, { IListingsParams } from "../actions/getListings";
import Categories from "@/components/navbar/Categories";
export const dynamic = 'force-dynamic';

interface HomeProps {
    searchParams: IListingsParams;
}

export default async function Home({ searchParams }: HomeProps) {
    const listing = await getListings(searchParams);
    const currentUser = await getCurrentUser();

    if (listing.length === 0) {
        return (
            <ClientOnly>
                <EmptyState showReset />
            </ClientOnly>
        );
    }

    return (
        <ClientOnly>
            <Container>
                <Categories />
                <div className="py-24 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-8 overflow-x-hidden">
                    {listing.map((item) => (
                        <ListingCard key={item.id} data={item} currentUser={currentUser} />
                    ))}
                </div>

            </Container>
        </ClientOnly>
    );
}
