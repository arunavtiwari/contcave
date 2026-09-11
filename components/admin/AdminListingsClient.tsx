"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
    FiCheck,
    FiClock,
    FiExternalLink,
    FiFileText,
    FiLayers,
    FiMapPin,
    FiShield,
    FiStar,
    FiX,
} from "react-icons/fi";
import { toast } from "sonner";

import {
    type AdminListingReview,
    type AdminListingReviewSummary,
    approveListingAction,
    getAdminListingReviewDetail,
    getAdminListingReviewPage,
    markInConversationAction,
    rejectListingAction,
} from "@/app/actions/listingActions";
import { AdminListingSkeletonRows, CuratedListingSkeletonRows } from "@/components/admin/AdminListingSkeletonRows";
import ListingReviewsModal from "@/components/admin/ListingReviewsModal";
import Modal from "@/components/modals/Modal";
import Button from "@/components/ui/Button";
import Pill from "@/components/ui/Pill";
import SafeHtml from "@/components/ui/SafeHtml";
import StatCard from "@/components/ui/StatCard";
import {
    EmptyTable,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TablePagination,
    TableRow,
} from "@/components/ui/Table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { formatINR, formatISTDate, formatISTDateTime } from "@/lib/utils";

type ListingStatus = "PENDING" | "VERIFIED" | "REJECTED";
type ConfirmAction = "approve" | "reject" | null;
type ViewMode = "STANDARD" | "CURATED";

const STATUS_OPTIONS: Array<{ value: "ALL" | ListingStatus; label: string }> = [
    { value: "ALL", label: "All" },
    { value: "PENDING", label: "Pending" },
    { value: "VERIFIED", label: "Verified" },
    { value: "REJECTED", label: "Rejected" },
];

function statusVariant(status: ListingStatus) {
    if (status === "VERIFIED") return "success";
    if (status === "REJECTED") return "destructive";
    return "warning";
}

function yesNo(value: boolean | null | undefined) {
    return value ? "Yes" : "No";
}

function asList(value: unknown): string[] {
    return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function detailValue(value: unknown) {
    if (value === null || value === undefined || value === "") return "Not provided";
    if (typeof value === "boolean") return yesNo(value);
    if (Array.isArray(value)) return value.length ? value.join(", ") : "Not provided";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
}

function fileSize(bytes?: number) {
    if (!bytes) return "File";
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function publicListingHref(slugOrId: string) {
    const path = `/listings/${slugOrId}`;
    if (typeof window === "undefined") return path;

    const url = new URL(window.location.href);
    if (url.hostname.startsWith("admin.")) {
        url.hostname = url.hostname.replace(/^admin\./, "");
    } else if (url.hostname.startsWith("staging.admin.")) {
        url.hostname = url.hostname.replace(/^staging\.admin\./, "staging.");
    }
    url.pathname = path;
    url.search = "";
    url.hash = "";
    return url.toString();
}

function KycPill({ verified, size }: { verified: boolean; size?: "xs" | "sm" | "md" }) {
    return (
        <Pill
            label={verified ? "KYC Verified" : "KYC Incomplete"}
            icon={FiShield}
            variant={verified ? "success" : "warning"}
            size={size}
        />
);
}

function Detail({ label, value }: { label: string; value: unknown }) {
    return (
        <div className="min-w-0 rounded-xl border border-border bg-muted/30 p-3">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
            <dd className="mt-1 whitespace-pre-wrap wrap-break-word text-sm font-medium text-foreground">{detailValue(value)}</dd>
        </div>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
            {children}
        </section>
    );
}

function DocumentLink({
    href,
    title,
    meta,
}: {
    href?: string;
    title: string;
    meta?: string;
}) {
    if (!href) {
        return (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                <FiFileText className="shrink-0" />
                <span>{title}: not available</span>
            </div>
        );
    }

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 text-sm transition hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
        >
            <span className="flex min-w-0 items-center gap-3">
                <FiFileText className="shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{title}</span>
                    {meta && <span className="block text-xs text-muted-foreground">{meta}</span>}
                </span>
            </span>
            <FiExternalLink className="shrink-0 text-muted-foreground" />
        </a>
    );
}

function KycGrid({ listing }: { listing: AdminListingReview }) {
    const user = listing.user;
    const checks = [
        { label: "Email", value: user?.email_verified },
        { label: "Phone", value: user?.phone_verified },
        { label: "Aadhaar OCR", value: user?.aadhaar_verified },
        { label: "Bank", value: user?.bank_verified },
    ];

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                <KycPill verified={Boolean(user?.is_verified)} size="sm" />
                {checks.map((check) => (
                    <Pill
                        key={check.label}
                        label={check.label}
                        icon={check.value ? FiCheck : FiX}
                        variant={check.value ? "success" : "neutral"}
                        size="sm"
                    />
                ))}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Detail label="Aadhaar Last 4" value={user?.aadhaar_last4 ? `**** ${user.aadhaar_last4}` : null} />
                <Detail label="Aadhaar Reference" value={user?.aadhaar_ref_id} />
                <Detail label="Bank Verified Name" value={user?.bank_verified_name} />
                <Detail label="Account Holder" value={user?.paymentDetails?.accountHolderName} />
                <Detail label="Bank" value={user?.paymentDetails?.bankName} />
                <Detail label="Account" value={user?.paymentDetails?.accountNumber} />
                <Detail label="IFSC" value={user?.paymentDetails?.ifscCode} />
                <Detail label="GSTIN" value={user?.paymentDetails?.gstin} />
                <Detail label="Cashfree Vendor" value={user?.paymentDetails?.cashfreeVendorId} />
            </div>
        </div>
    );
}

function ReviewModal({
    listing,
    onClose,
    onRequestAction,
    isMutating,
}: {
    listing: AdminListingReview | null;
    onClose: () => void;
    onRequestAction: (action: ConfirmAction) => void;
    isMutating: boolean;
}) {
    if (!listing) return null;

    const previewHref = publicListingHref(listing.slug || listing.id);
    const addons = Array.isArray(listing.addons) ? listing.addons as Array<Record<string, unknown>> : [];
    const allAmenities = [...asList(listing.amenities), ...asList(listing.otherAmenities)];
    const agreementUrl = listing.verifications.agreementPdf?.pdfUrl || listing.verifications.agreementPdf?.url;

    return (
        <Modal
            isOpen={Boolean(listing)}
            onCloseAction={onClose}
            onSubmitAction={onClose}
            title="Listing Review"
            actionLabel="Close"
            customWidth="w-full max-w-6xl"
            customHeight="max-h-[92vh]"
            body={
                <div className="space-y-8" data-testid="admin-listing-review-modal">
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="space-y-4">
                            <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-muted">
                                <Image
                                    src={listing.imageSrc[0] || "/assets/listing-image-default.png"}
                                    alt={listing.title}
                                    fill
                                    sizes="(max-width: 1024px) 100vw, 55vw"
                                    className="object-cover"
                                />
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {listing.imageSrc.slice(1, 5).map((image) => (
                                    <div key={image} className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                                        <Image src={image} alt="" fill sizes="160px" className="object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Pill label={listing.status} variant={statusVariant(listing.status)} size="sm" />
                                <KycPill verified={Boolean(listing.user?.is_verified)} size="sm" />
                                <Pill label={listing.active ? "Active" : "Inactive"} variant={listing.active ? "success" : "neutral"} size="sm" />
                            </div>
                            <div>
                                <h2 className="font-serif text-3xl font-semibold leading-tight text-foreground">{listing.title}</h2>
                                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                                    <FiMapPin /> {listing.locationValue}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Detail label="Category" value={listing.category} />
                                <Detail label="Base Price" value={listing.price != null ? formatINR(listing.price) : "—"} />
                                <Detail label="Submitted" value={formatISTDateTime(listing.createdAt)} />
                                <Detail label="Reviewed" value={listing.reviewedAt ? formatISTDateTime(listing.reviewedAt) : null} />
                            </div>
                            <DocumentLink href={previewHref} title="Open public preview" meta="Listing detail page" />
                            {listing.status === "REJECTED" && <Detail label="Rejection Reason" value={listing.rejectionReason} />}
                        </div>
                    </div>

                    <Section title="Host & KYC">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <Detail label="Host Name" value={listing.user?.name} />
                            <Detail label="Email" value={listing.user?.email} />
                            <Detail label="Phone" value={listing.user?.phone} />
                        </div>
                        <KycGrid listing={listing} />
                    </Section>

                    <Section title="Documents">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {listing.verifications.documents.length > 0 ? listing.verifications.documents.map((doc, index) => (
                                <DocumentLink
                                    key={`${doc.url || doc.original_filename || index}`}
                                    href={doc.url}
                                    title={doc.original_filename || doc.name || `Verification document ${index + 1}`}
                                    meta={fileSize(doc.bytes)}
                                />
                            )) : (
                                <DocumentLink title="Verification documents" />
                            )}
                            <DocumentLink href={agreementUrl} title="Signed agreement PDF" meta="Private document" />
                        </div>
                    </Section>

                    {listing.videoSrc && (
                        <Section title="Video Tour">
                            <video src={listing.videoSrc} controls className="w-full max-w-2xl rounded-xl border border-border" />
                        </Section>
                    )}

                    <Section title="Listing Details">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                            <Detail label="Carpet Area" value={`${listing.carpetArea} sq ft`} />
                            <Detail label="Maximum Pax" value={listing.maximumPax} />
                            <Detail label="Minimum Booking" value={`${listing.minimumBookingHours} hr`} />
                            <Detail label="Instant Booking" value={listing.instantBooking} />
                            <Detail label="Operational Days" value={listing.operationalDays} />
                            <Detail label="Operational Hours" value={listing.operationalHours} />
                            <Detail label="Shoot Types" value={listing.type} />
                            <Detail label="Actual Location" value={listing.actualLocation} />
                        </div>
                    </Section>

                    <Section title="Amenities">
                        <div className="flex flex-wrap gap-2">
                            {allAmenities.length > 0 ? allAmenities.map((item) => (
                                <Pill key={item} label={item} variant="subtle" size="xs" />
                            )) : <span className="text-sm text-muted-foreground">No amenities provided.</span>}
                        </div>
                    </Section>

                    <Section title="Add-ons">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            {addons.length > 0 ? addons.map((addon, index) => (
                                <Detail
                                    key={`${addon.name || index}`}
                                    label={String(addon.name || `Add-on ${index + 1}`)}
                                    value={`${formatINR(Number(addon.price || 0))} • Qty ${Number(addon.qty || 0)}`}
                                />
                            )) : <span className="text-sm text-muted-foreground">No add-ons defined.</span>}
                        </div>
                    </Section>

                    <Section title="Sets">
                        {listing.sets.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {listing.sets.map((set) => (
                                    <div key={set.id} className="overflow-hidden rounded-xl border border-border bg-background">
                                        <div className="relative aspect-video w-full bg-muted">
                                            {set.images.length > 0 ? (
                                                <Image src={set.images[0]} alt={set.name} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No Image</div>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <div className="font-semibold text-foreground">{set.name}</div>
                                            <div className="mt-1 text-sm text-muted-foreground">{formatINR(set.price)} • {set.images.length} images</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Detail label="Sets" value={listing.hasSets ? "No set data provided" : "Entire studio listing"} />
                        )}
                    </Section>

                    <Section title="Packages">
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                            {listing.packages.length > 0 ? listing.packages.map((pkg) => (
                                <Detail
                                    key={pkg.id}
                                    label={pkg.title}
                                    value={`${formatINR(pkg.offeredPrice)} • ${pkg.durationHours} hr • ${pkg.features.join(", ") || "No features"}`}
                                />
                            )) : <Detail label="Packages" value="No packages defined" />}
                        </div>
                    </Section>

                    <Section title="Description">
                        <div className="rounded-xl border border-border bg-background p-4">
                            <SafeHtml html={listing.description} className="text-sm" />
                        </div>
                    </Section>

                    {listing.customTerms && (
                        <Section title="Custom Terms">
                            <div className="rounded-xl border border-border bg-background p-4">
                                <SafeHtml html={listing.customTerms} className="text-sm" />
                            </div>
                        </Section>
                    )}
                </div>
            }
            footer={
                <div className="flex flex-col gap-3 border-t border-border bg-background pt-4 sm:flex-row sm:justify-between">
                    <Button
                        label="Open Preview"
                        href={previewHref}
                        target="_blank"
                        variant="outline"
                        icon={FiExternalLink}
                        data-testid="admin-review-open-preview"
                    />
                    <div className="flex flex-col gap-3 sm:flex-row">
                        {listing.status !== "VERIFIED" && (
                            <Button
                                label="Reject"
                                variant="destructive"
                                outline
                                disabled={isMutating || listing.status === "REJECTED"}
                                onClick={() => onRequestAction("reject")}
                                data-testid="admin-review-reject"
                            />
                        )}
                        {listing.status !== "VERIFIED" && (
                            <Button
                                label="Approve"
                                variant="default"
                                disabled={isMutating}
                                onClick={() => onRequestAction("approve")}
                                data-testid="admin-review-approve"
                            />
                        )}
                    </div>
                </div>
            }
            selfActionButton
        />
    );
}

type AdminListingsClientProps = {
    listings: AdminListingReviewSummary[];
    selectedStatus: "ALL" | ListingStatus;
    listingType: ViewMode;
    page: number;
    pageSize: number;
    total: number;
    counts: Record<"ALL" | ListingStatus, number>;
    curatedTotal: number;
};

export default function AdminListingsClient({
    listings,
    selectedStatus,
    listingType,
    page,
    pageSize,
    total,
    counts,
    curatedTotal,
}: AdminListingsClientProps) {
    const router = useRouter();
    const [pageData, setPageData] = useState({
        listings,
        total,
        counts,
        curatedTotal,
        page,
        pageSize,
    });

    const [prevProps, setPrevProps] = useState({ listings, total, counts, curatedTotal, page, pageSize });
    if (
        listings !== prevProps.listings ||
        page !== prevProps.page ||
        total !== prevProps.total ||
        curatedTotal !== prevProps.curatedTotal
    ) {
        setPrevProps({ listings, total, counts, curatedTotal, page, pageSize });
        setPageData({ listings, total, counts, curatedTotal, page, pageSize });
    }

    const [optimisticView, setOptimisticView] = useState<ViewMode>(listingType);
    const [optimisticStatus, setOptimisticStatus] = useState<"ALL" | ListingStatus>(selectedStatus);
    const [isNavigating, startNavTransition] = useTransition();

    const [prevListingType, setPrevListingType] = useState(listingType);
    if (listingType !== prevListingType) {
        setPrevListingType(listingType);
        setOptimisticView(listingType);
    }

    const [prevSelectedStatus, setPrevSelectedStatus] = useState(selectedStatus);
    if (selectedStatus !== prevSelectedStatus) {
        setPrevSelectedStatus(selectedStatus);
        setOptimisticStatus(selectedStatus);
    }

    const viewMode = optimisticView;
    const status = optimisticStatus;
    const [selected, setSelected] = useState<AdminListingReview | null>(null);
    const [reviewsFor, setReviewsFor] = useState<{ id: string; title: string } | null>(null);
    const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [isPending, startTransition] = useTransition();

    const standardListings = useMemo(() => viewMode === "STANDARD" ? pageData.listings : [], [pageData.listings, viewMode]);
    const curatedListings = useMemo(() => viewMode === "CURATED" ? pageData.listings : [], [pageData.listings, viewMode]);
    const visibleListings = standardListings;

    const outreachLabel = (listing: AdminListingReviewSummary) => {
        if (listing.inConversation) return { label: "In Conversation", variant: "success" as const };
        if (listing.notifyReminderAt) return { label: "Reminder Sent", variant: "info" as const };
        if (listing.notifyEmailSentAt) return { label: "Email Sent", variant: "warning" as const };
        return { label: "Not Sent", variant: "neutral" as const };
    };

    const openReview = (listingId: string) => {
        startTransition(async () => {
            const detail = await getAdminListingReviewDetail(listingId);
            if (!detail) {
                toast.error("Listing review details are unavailable");
                return;
            }
            setSelected(detail);
        });
    };

    const [sortField, setSortField] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc" | false>(false);

    const handleSort = (field: string) => {
        if (sortField === field) {
            if (sortDirection === "asc") {
                setSortDirection("desc");
            } else if (sortDirection === "desc") {
                setSortField(null);
                setSortDirection(false);
            }
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const sortedVisibleListings = useMemo(() => {
        if (!sortField || !sortDirection) return visibleListings;
        return [...visibleListings].sort((a, b) => {
            let cmp = 0;
            if (sortField === "title") {
                cmp = (a.title || "").localeCompare(b.title || "");
            } else if (sortField === "host") {
                cmp = (a.user?.name || "").localeCompare(b.user?.name || "");
            } else if (sortField === "status") {
                cmp = (a.status || "").localeCompare(b.status || "");
            } else if (sortField === "price") {
                cmp = (a.price || 0) - (b.price || 0);
            } else if (sortField === "createdAt") {
                cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            }
            return sortDirection === "asc" ? cmp : -cmp;
        });
    }, [visibleListings, sortField, sortDirection]);

    const sortedCuratedListings = useMemo(() => {
        if (!sortField || !sortDirection) return curatedListings;
        return [...curatedListings].sort((a, b) => {
            let cmp = 0;
            if (sortField === "title") {
                cmp = (a.title || "").localeCompare(b.title || "");
            } else if (sortField === "city") {
                cmp = (a.locationValue || "").localeCompare(b.locationValue || "");
            } else if (sortField === "enquiries") {
                cmp = (a.enquiryCount || 0) - (b.enquiryCount || 0);
            }
            return sortDirection === "asc" ? cmp : -cmp;
        });
    }, [curatedListings, sortField, sortDirection]);

    const navigate = (
        nextView: ViewMode,
        nextStatus = optimisticStatus,
        nextPage = 1,
        nextPageSize = pageData.pageSize
    ) => {
        setOptimisticView(nextView);
        setOptimisticStatus(nextStatus);

        const search = new URLSearchParams({
            view: nextView,
            status: nextStatus,
            page: String(nextPage),
            pageSize: String(nextPageSize),
        });
        window.history.pushState(null, "", `/admin/dashboard/listings?${search.toString()}`);

        startNavTransition(async () => {
            try {
                const res = await getAdminListingReviewPage({
                    page: nextPage,
                    pageSize: nextPageSize,
                    status: nextStatus === "ALL" ? undefined : nextStatus,
                    listingType: nextView,
                });
                setPageData({
                    listings: res.listings,
                    total: res.total,
                    counts: res.counts,
                    curatedTotal: res.curatedTotal,
                    page: res.page,
                    pageSize: res.pageSize,
                });
            } catch {
                toast.error("Failed to load listings");
            }
        });
    };

    useEffect(() => {
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            const view = params.get("view") === "CURATED" ? "CURATED" : "STANDARD";
            const s = ["ALL", "PENDING", "VERIFIED", "REJECTED"].includes(params.get("status") || "")
                ? params.get("status") as "ALL" | ListingStatus
                : "PENDING";
            const p = Number(params.get("page")) || 1;
            const ps = Number(params.get("pageSize")) || pageData.pageSize;
            setOptimisticView(view);
            setOptimisticStatus(s);
            startNavTransition(async () => {
                try {
                    const res = await getAdminListingReviewPage({
                        page: p,
                        pageSize: ps,
                        status: s === "ALL" ? undefined : s,
                        listingType: view,
                    });
                    setPageData({
                        listings: res.listings,
                        total: res.total,
                        counts: res.counts,
                        curatedTotal: res.curatedTotal,
                        page: res.page,
                        pageSize: res.pageSize,
                    });
                } catch {
                    toast.error("Failed to load listings");
                }
            });
        };
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [pageData.pageSize]);

    const resetConfirm = () => {
        setConfirmAction(null);
        setRejectReason("");
    };

    const submitDecision = () => {
        if (!selected || !confirmAction) return;
        if (confirmAction === "reject" && rejectReason.trim().length < 10) {
            toast.error("Please enter at least 10 characters for the rejection reason.");
            return;
        }

        startTransition(async () => {
            const result = confirmAction === "approve"
                ? await approveListingAction({ listingId: selected.id })
                : await rejectListingAction({ listingId: selected.id, reason: rejectReason.trim() });

            if (result.success) {
                toast.success(confirmAction === "approve" ? "Listing approved" : "Listing rejected");
                resetConfirm();
                setSelected(null);
                try {
                    const res = await getAdminListingReviewPage({
                        page: pageData.page,
                        pageSize: pageData.pageSize,
                        status: optimisticStatus === "ALL" ? undefined : optimisticStatus,
                        listingType: optimisticView,
                    });
                    setPageData({
                        listings: res.listings,
                        total: res.total,
                        counts: res.counts,
                        curatedTotal: res.curatedTotal,
                        page: res.page,
                        pageSize: res.pageSize,
                    });
                } catch {
                    router.refresh();
                }
            } else {
                toast.error(result.error || "Failed to update listing");
            }
        });
    };

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between gap-4">
                <Tabs
                    value={viewMode}
                    onValueChange={(m) => navigate(m as ViewMode, m === "CURATED" ? "ALL" : status)}
                    className="w-fit gap-0"
                >
                    <TabsList>
                        <TabsTrigger value="STANDARD" count={pageData.counts.ALL}>
                            Verified
                        </TabsTrigger>
                        <TabsTrigger value="CURATED" count={pageData.curatedTotal}>
                            Curated
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
                {viewMode === "CURATED" && (
                    <Button label="+ New Curated" href="/admin/dashboard/listings/curated" size="sm" fit />
                )}
            </div>

            <div className="space-y-6">
            {viewMode === "CURATED" ? (
                <>
                    {curatedListings.length === 0 ? (
                        <EmptyTable
                            icon={FiLayers}
                            label="No curated listings yet"
                            description="Create one using the button above."
                        />
                    ) : (
                        <Table
                            footer={
                                <TablePagination
                                    page={pageData.page}
                                    pageSize={pageData.pageSize}
                                    total={pageData.curatedTotal}
                                    pageSizeOptions={[10, 20, 50]}
                                    onPageSizeChange={(newSize) => navigate(viewMode, status, 1, newSize)}
                                    label="curated listings"
                                    hrefForPage={(nextPage, nextSize) => `/admin/dashboard/listings?view=${viewMode}&status=${status}&page=${nextPage}&pageSize=${nextSize || pageData.pageSize}`}
                                    onPageChange={(nextPage) => navigate(viewMode, status, nextPage, pageData.pageSize)}
                                />
                            }
                        >
                            <TableHeader>
                                <TableRow>
                                    <TableHead
                                        sortable
                                        sortDirection={sortField === "title" ? sortDirection : false}
                                        onSort={() => handleSort("title")}
                                    >
                                        Studio
                                    </TableHead>
                                    <TableHead
                                        sortable
                                        sortDirection={sortField === "city" ? sortDirection : false}
                                        onSort={() => handleSort("city")}
                                    >
                                        City
                                    </TableHead>
                                    <TableHead
                                        sortable
                                        sortDirection={sortField === "enquiries" ? sortDirection : false}
                                        onSort={() => handleSort("enquiries")}
                                    >
                                        Enquiries
                                    </TableHead>
                                    <TableHead>Outreach Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isNavigating ? (
                                    <CuratedListingSkeletonRows count={Math.min(pageData.pageSize, pageData.curatedTotal || 5)} />
                                ) : (
                                    sortedCuratedListings.map(listing => {
                                    const { label, variant } = outreachLabel(listing);
                                    const isHighPriority = (listing.enquiryCount ?? 0) >= 3;
                                    return (
                                        <TableRow key={listing.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm text-foreground">{listing.title}</span>
                                                    {isHighPriority && <Pill label="High Priority" variant="destructive" size="xs" />}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{listing.locationValue}</TableCell>
                                            <TableCell className="text-sm font-semibold text-foreground">{listing.enquiryCount ?? 0}</TableCell>
                                            <TableCell>
                                                <Pill label={label} variant={variant} size="xs" />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <a href={publicListingHref(listing.slug || listing.id)} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">View</a>
                                                    <button
                                                        type="button"
                                                        className="text-xs text-muted-foreground hover:text-foreground hover:underline underline-offset-2 cursor-pointer"
                                                        onClick={() => setReviewsFor({ id: listing.id, title: listing.title })}
                                                    >
                                                        Reviews
                                                    </button>
                                                    {!listing.inConversation && (
                                                        <button type="button" className="text-xs text-success hover:underline cursor-pointer"
                                                            onClick={() => startTransition(async () => {
                                                                const result = await markInConversationAction({ listingId: listing.id, inConversation: true });
                                                                if (!result.success) {
                                                                    toast.error(result.error || "Failed to update outreach status");
                                                                    return;
                                                                }
                                                                toast.success("Listing marked in conversation");
                                                                router.refresh();
                                                            })}>
                                                            Mark In Conversation
                                                        </button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }))}
                            </TableBody>
                        </Table>
                    )}
                </>
            ) : (
            <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label="All Listings" value={pageData.counts?.ALL} icon={FiLayers} />
                <StatCard label="Pending" value={pageData.counts?.PENDING} icon={FiClock} />
                <StatCard label="Verified" value={pageData.counts?.VERIFIED} icon={FiCheck} />
                <StatCard label="Rejected" value={pageData.counts?.REJECTED} icon={FiX} />
            </div>

            <Tabs
                value={status}
                onValueChange={(val) => navigate("STANDARD", val as "ALL" | ListingStatus)}
                className="w-fit gap-0"
            >
                <TabsList aria-label="Listing status filters">
                    {STATUS_OPTIONS.map((option) => (
                        <TabsTrigger
                            key={option.value}
                            value={option.value}
                            count={pageData.counts[option.value]}
                        >
                            {option.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {visibleListings.length === 0 && !isNavigating ? (
                <EmptyTable
                    icon={FiShield}
                    label="No listings in this view"
                    description="Change the status filter to review another queue."
                />
            ) : (
                <Table
                    footer={
                        <TablePagination
                            page={pageData.page}
                            pageSize={pageData.pageSize}
                            total={pageData.total}
                            pageSizeOptions={[10, 20, 50]}
                            onPageSizeChange={(newSize) => navigate(viewMode, status, 1, newSize)}
                            label="listings"
                            hrefForPage={(nextPage, nextSize) => `/admin/dashboard/listings?view=${viewMode}&status=${status}&page=${nextPage}&pageSize=${nextSize || pageData.pageSize}`}
                            onPageChange={(nextPage) => navigate(viewMode, status, nextPage, pageData.pageSize)}
                        />
                    }
                >
                    <TableHeader>
                        <TableRow>
                            <TableHead
                                sortable
                                sortDirection={sortField === "title" ? sortDirection : false}
                                onSort={() => handleSort("title")}
                            >
                                Listing
                            </TableHead>
                            <TableHead
                                sortable
                                sortDirection={sortField === "host" ? sortDirection : false}
                                onSort={() => handleSort("host")}
                            >
                                Host
                            </TableHead>
                            <TableHead
                                sortable
                                sortDirection={sortField === "status" ? sortDirection : false}
                                onSort={() => handleSort("status")}
                            >
                                Status
                            </TableHead>
                            <TableHead
                                sortable
                                sortDirection={sortField === "price" ? sortDirection : false}
                                onSort={() => handleSort("price")}
                            >
                                Price
                            </TableHead>
                            <TableHead
                                sortable
                                sortDirection={sortField === "createdAt" ? sortDirection : false}
                                onSort={() => handleSort("createdAt")}
                            >
                                Submitted
                            </TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isNavigating ? (
                            <AdminListingSkeletonRows count={Math.min(pageData.pageSize, pageData.total || 6)} />
                        ) : (
                            sortedVisibleListings.map((listing) => (
                            <TableRow key={listing.id}>
                                <TableCell>
                                    <div className="flex min-w-72 items-center gap-3">
                                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                                            <Image
                                                src={listing.imageSrc[0] || "/assets/listing-image-default.png"}
                                                alt={listing.title}
                                                fill
                                                sizes="48px"
                                                className="object-cover"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-foreground">{listing.title}</div>
                                            <div className="truncate text-xs text-muted-foreground">{listing.category} • {listing.locationValue}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="min-w-52 space-y-1">
                                        <div className="truncate text-sm font-medium text-foreground">{listing.user?.name || "Unknown host"}</div>
                                        <div className="truncate text-xs text-muted-foreground">{listing.user?.email || "No email"}</div>
                                        <KycPill verified={Boolean(listing.user?.is_verified)} size="xs" />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Pill label={listing.status} variant={statusVariant(listing.status)} size="xs" />
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-sm font-semibold text-foreground">
                                    {listing.price != null ? formatINR(listing.price) : "—"}
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                    {formatISTDate(listing.createdAt, { day: "numeric", month: "short", year: "numeric" })}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            icon={FiStar}
                                            isIconOnly
                                            outline
                                            aria-label={`Manage reviews: ${listing.title}`}
                                            tooltip="Reviews"
                                            data-testid={`reviews-listing-${listing.id}`}
                                            onClick={() => setReviewsFor({ id: listing.id, title: listing.title })}
                                        />
                                        <Button
                                            icon={FiExternalLink}
                                            isIconOnly
                                            outline
                                            aria-label={`Open listing review: ${listing.title}`}
                                            tooltip="Open review"
                                            data-testid={`review-listing-${listing.id}`}
                                            onClick={() => openReview(listing.id)}
                                            disabled={isPending}
                                        />
                                    </div>
                                </TableCell>
                            </TableRow>
                        )))}
                    </TableBody>
                </Table>
            )}

            <ReviewModal
                listing={selected}
                onClose={() => setSelected(null)}
                onRequestAction={setConfirmAction}
                isMutating={isPending}
            />

            <ListingReviewsModal
                listing={reviewsFor}
                onClose={() => setReviewsFor(null)}
            />

            {selected && confirmAction && (
                <Modal
                    isOpen={Boolean(confirmAction)}
                    onCloseAction={() => !isPending && resetConfirm()}
                    onSubmitAction={submitDecision}
                    title={confirmAction === "approve" ? "Approve Listing" : "Reject Listing"}
                    actionLabel={confirmAction === "approve" ? "Approve Listing" : "Reject Listing"}
                    primaryActionVariant={confirmAction === "approve" ? "default" : "destructive"}
                    secondaryActionLabel="Cancel"
                    secondaryActionAction={() => !isPending && resetConfirm()}
                    nestedModal
                    disableOverlayClose
                    disabled={isPending}
                    isLoading={isPending}
                    customWidth="w-full max-w-lg"
                    body={
                        <div className="space-y-4" data-testid="admin-listing-confirm-modal">
                            <p className="text-sm leading-6 text-muted-foreground">
                                Are you sure you want to {confirmAction === "approve" ? "approve" : "reject"} <span className="font-semibold text-foreground">{selected.title}</span>?
                            </p>
                            {confirmAction === "reject" && (
                                <div>
                                    <label htmlFor="listing-rejection-reason" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Rejection reason
                                    </label>
                                    <textarea
                                        id="listing-rejection-reason"
                                        value={rejectReason}
                                        onChange={(event) => setRejectReason(event.target.value)}
                                        minLength={10}
                                        maxLength={500}
                                        rows={5}
                                        className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10"
                                        placeholder="Explain what needs to be corrected before this listing can be approved."
                                        disabled={isPending}
                                    />
                                    <div className="mt-1 text-right text-xs text-muted-foreground">{rejectReason.trim().length}/500</div>
                                </div>
                            )}
                        </div>
                    }
                />
            )}
            </>
            )}
            </div>
        </div>
    );
}
