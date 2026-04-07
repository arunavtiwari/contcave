import Container from "@/components/Container";

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
                                    <div className="h-6 w-6 bg-neutral-100 rounded animate-pulse" />
                                    <div className="h-5 w-32 bg-neutral-100 rounded animate-pulse" />
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                {/* Main Content Skeleton */}
                <div className="flex flex-col sm:p-8 sm:pt-12 w-full gap-5 sm:border-l-2 border-gray-200 animate-pulse">
                    <div className="flex flex-col w-full gap-5">

                        {/* Header Line */}
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <div className="h-9 w-48 bg-neutral-100 rounded-lg mb-2.5" />
                                <div className="h-6 w-96 bg-neutral-100 rounded" />
                            </div>
                        </div>

                        {/* Content Grid */}
                        <div className="grid lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">

                                {/* Banner & Image Card */}
                                <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
                                    <div className="h-32 bg-neutral-100 w-full relative">
                                        <div className="absolute -bottom-16 left-8">
                                            <div className="w-32 h-32 rounded-full border-4 border-white bg-neutral-200" />
                                        </div>
                                    </div>
                                    <div className="pt-20 py-6 px-8">
                                        <div className="flex justify-between mb-6 gap-8 items-center">
                                            <div className="h-8 w-48 bg-neutral-100 rounded" />
                                            <div className="h-10 w-32 bg-neutral-100 rounded-xl" />
                                        </div>
                                        <div className="h-16 w-full bg-neutral-100 rounded" />
                                    </div>
                                </div>

                                {/* Personal Details Card */}
                                <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-8">
                                    <div className="h-6 w-40 bg-neutral-100 rounded mb-6" />
                                    <div className="space-y-6">
                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-5 w-5 bg-neutral-100 rounded" />
                                                    <div className="h-5 w-24 bg-neutral-100 rounded" />
                                                </div>
                                                <div className="h-5 w-40 bg-neutral-100 rounded" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>

                            {/* Right Panel Verification Card Skeleton */}
                            <div className="space-y-6">
                                <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-6">
                                    <div className="flex flex-col items-center text-center space-y-4">
                                        <div className="w-16 h-16 bg-neutral-100 rounded-full" />
                                        <div className="flex flex-col items-center gap-2 w-full">
                                            <div className="h-6 w-40 bg-neutral-100 rounded" />
                                            <div className="h-10 w-full bg-neutral-100 rounded" />
                                        </div>
                                        <div className="h-12 w-full bg-neutral-100 rounded-lg mt-4" />
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
