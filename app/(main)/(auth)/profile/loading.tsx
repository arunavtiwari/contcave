import Container from "@/components/Container";
import Skeleton from "@/components/ui/Skeleton";

import ProfileSkeletonClient from "./ProfileSkeletonClient";

export default function Loading() {
    return (
        <Container>
            <div className="flex min-h-screen">
                {/* Sidebar Skeleton */}
                <div className="hidden sm:flex flex-col sticky top-21.25 pr-4 pl-0 py-6 min-w-62.5 h-fit">
                    <nav>
                        <ul className="flex flex-col gap-2">
                            {[...Array(4)].map((_, i) => (
                                <li key={i} className="px-4 py-3 flex items-center gap-3 rounded-full">
                                    <Skeleton className="h-6 w-6" />
                                    <Skeleton className="h-5 w-32" />
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                {/* Main Content Skeleton */}
                <div className="flex flex-col sm:p-8 sm:pt-6 w-full gap-5 sm:border-l-2 border-border mb-20">
                    <ProfileSkeletonClient />
                </div>
            </div>
        </Container>
    );
}
