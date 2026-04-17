import Container from "@/components/Container";
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
    return (
        <Container>
            <div className="flex min-h-screen">
                {/* Sidebar Skeleton */}
                <div className="hidden sm:flex flex-col sticky top-21.25 pr-4 pl-0 py-10 min-w-62.5 h-fit">
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
                <div className="flex flex-col sm:p-8 sm:pt-12 w-full gap-5 sm:border-l-2 border-border">
                    <div className="flex flex-col w-full gap-5">

                        {/* Header Line */}
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <Skeleton className="h-9 w-48 mb-2.5" />
                                <Skeleton className="h-6 w-96" />
                            </div>
                        </div>

                        {/* Content Grid */}
                        <div className="grid lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">

                                {/* Banner & Image Card */}
                                <div className="bg-background rounded-2xl border border-border overflow-hidden">
                                    <Skeleton className="h-32 w-full relative rounded-none">
                                        <div className="absolute -bottom-16 left-8">
                                            <Skeleton className="w-32 h-32 rounded-full border-4 border-white" />
                                        </div>
                                    </Skeleton>
                                    <div className="pt-20 py-6 px-8">
                                        <div className="flex justify-between mb-6 gap-8 items-center">
                                            <Skeleton className="h-8 w-48" />
                                            <Skeleton className="h-10 w-32 rounded-xl" />
                                        </div>
                                        <Skeleton className="h-16 w-full" />
                                    </div>
                                </div>

                                {/* Personal Details Card */}
                                <div className="bg-white rounded-2xl  border border-gray-200 p-8">
                                    <Skeleton className="h-6 w-40 mb-6" />
                                    <div className="space-y-6">
                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <Skeleton className="h-5 w-5" />
                                                    <Skeleton className="h-5 w-24" />
                                                </div>
                                                <Skeleton className="h-5 w-40" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>

                            {/* Right Panel Verification Card Skeleton */}
                            <div className="space-y-6">
                                <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-6">
                                    <div className="flex flex-col items-center text-center space-y-4">
                                        <Skeleton className="w-16 h-16 rounded-full" />
                                        <div className="flex flex-col items-center gap-2 w-full">
                                            <Skeleton className="h-6 w-40" />
                                            <Skeleton className="h-10 w-full" />
                                        </div>
                                        <Skeleton className="h-12 w-full rounded-lg mt-4" />
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </Container>
    );
}
