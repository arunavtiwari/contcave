import React from "react";

import Skeleton from "@/components/ui/Skeleton";

/**
 * Matches PendingListingsPage table exactly:
 * Columns: Listing | Host | Category | Price | Submitted | Actions (right-aligned)
 */
export default function TableSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                        <tr className="bg-gray-50/80">
                            <th scope="col" className="px-6 py-3 text-left">
                                <Skeleton className="h-3 w-12" />
                            </th>
                            <th scope="col" className="px-6 py-3 text-left">
                                <Skeleton className="h-3 w-8" />
                            </th>
                            <th scope="col" className="px-6 py-3 text-left">
                                <Skeleton className="h-3 w-16" />
                            </th>
                            <th scope="col" className="px-6 py-3 text-left">
                                <Skeleton className="h-3 w-10" />
                            </th>
                            <th scope="col" className="px-6 py-3 text-left">
                                <Skeleton className="h-3 w-16" />
                            </th>
                            <th scope="col" className="px-6 py-3 text-right">
                                <Skeleton className="h-3 w-12 ml-auto" />
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <tr key={i}>
                                {/* Listing */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                                        <div className="min-w-0 space-y-1.5">
                                            <Skeleton className="h-3.5 w-36" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    </div>
                                </td>
                                {/* Host */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="space-y-1.5">
                                        <Skeleton className="h-3.5 w-24" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                </td>
                                {/* Category */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <Skeleton className="h-6 w-16 rounded-md" />
                                </td>
                                {/* Price */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <Skeleton className="h-3.5 w-14" />
                                </td>
                                {/* Submitted */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <Skeleton className="h-3.5 w-20" />
                                </td>
                                {/* Actions */}
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Skeleton className="h-7 w-16 rounded-lg" />
                                        <Skeleton className="h-7 w-18 rounded-xl" />
                                        <Skeleton className="h-7 w-14 rounded-xl" />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
