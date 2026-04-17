import Image from "next/image";
import { FaClock, FaExclamationTriangle } from "react-icons/fa";

import getPendingListings from "@/app/actions/getPendingListings";
import ListingActions from "@/components/admin/ListingActions";

export const dynamic = "force-dynamic";

const BASE_URL = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default async function PendingListingsPage() {
    const pendingListings = await getPendingListings();

    return (
        <div className="w-full flex flex-col gap-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Pending Listings</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Review and manage listings submitted by hosts.
                </p>
            </div>

            {/* Stats Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                        <FaClock size={18} className="text-amber-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900">{pendingListings.length}</div>
                        <div className="text-xs text-gray-500 font-medium">Awaiting Review</div>
                    </div>
                </div>
            </div>

            {/* Table */}
            {pendingListings.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <FaExclamationTriangle size={20} className="text-gray-400" />
                    </div>
                    <div className="text-sm font-medium text-gray-900">No pending listings</div>
                    <p className="text-sm text-gray-500">All submissions have been reviewed. Check back later.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr className="bg-gray-50/80">
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Listing
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Host
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Price
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Submitted
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {pendingListings.map((listing) => (
                                    <tr key={listing.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 shrink-0 relative rounded-lg overflow-hidden border border-gray-200">
                                                    <Image
                                                        src={listing.imageSrc[0] || "/assets/placeholder.jpg"}
                                                        alt={listing.title}
                                                        fill
                                                        sizes="40px"
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium text-gray-900 truncate max-w-48" title={listing.title}>
                                                        {listing.title}
                                                    </div>
                                                    <div className="text-xs text-gray-500 truncate max-w-48" title={listing.locationValue}>
                                                        {listing.locationValue}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{listing.user?.name || "Unknown"}</div>
                                            <div className="text-xs text-gray-500">{listing.user?.email || "N/A"}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 capitalize">
                                                {listing.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            ₹{listing.price.toLocaleString("en-IN")}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(listing.createdAt).toLocaleDateString("en-IN", {
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
