import Image from "next/image";
import { FaClock, FaExclamationTriangle } from "react-icons/fa";

import getPendingListings from "@/app/actions/getPendingListings";
import ListingActions from "@/components/admin/ListingActions";
import { formatINR,formatISTDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const BASE_URL = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default async function PendingListingsPage() {
    const pendingListings = await getPendingListings();

    return (
        <div className="w-full flex flex-col gap-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Pending Listings</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Review and manage listings submitted by hosts.
                </p>
            </div>

            {/* Stats Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-background rounded-xl border border-border p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FaClock size={18} className="text-foreground" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-foreground">{pendingListings.length}</div>
                        <div className="text-xs text-muted-foreground font-medium">Awaiting Review</div>
                    </div>
                </div>
            </div>

            {/* Table */}
            {pendingListings.length === 0 ? (
                <div className="bg-background rounded-xl border border-border px-6 py-16 flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <FaExclamationTriangle size={20} className="text-muted-foreground" />
                    </div>
                    <div className="text-sm font-medium text-foreground">No pending listings</div>
                    <p className="text-sm text-muted-foreground">All submissions have been reviewed. Check back later.</p>
                </div>
            ) : (
                <div className="bg-background rounded-xl border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead>
                                <tr className="bg-muted/80">
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Listing
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Host
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Price
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                                        Submitted
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-muted">
                                {pendingListings.map((listing) => (
                                    <tr key={listing.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 shrink-0 relative rounded-lg overflow-hidden border border-border">
                                                    <Image
                                                        src={listing.imageSrc[0] || "/assets/placeholder.jpg"}
                                                        alt={listing.title}
                                                        fill
                                                        sizes="40px"
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium text-foreground truncate max-w-48" title={listing.title}>
                                                        {listing.title}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground truncate max-w-48" title={listing.locationValue}>
                                                        {listing.locationValue}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-foreground">{listing.user?.name || "Unknown"}</div>
                                            <div className="text-xs text-muted-foreground">{listing.user?.email || "N/A"}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground capitalize">
                                                {listing.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                                            {formatINR(listing.price)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            {formatISTDate(listing.createdAt, {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <ListingActions
                                                listingId={listing.id}
                                                previewUrl={`${BASE_URL}/listings/${listing.id}`}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
