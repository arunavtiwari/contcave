"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import type { IconType } from "react-icons";
import {
    FiCheck,
    FiClock,
    FiExternalLink,
    FiEye,
    FiFileText,
    FiLayers,
    FiMapPin,
    FiShield,
    FiX,
} from "react-icons/fi";
import { toast } from "sonner";

import { type AdminListingReview, approveListingAction, rejectListingAction } from "@/app/actions/listingActions";
import Modal from "@/components/modals/Modal";
import Button from "@/components/ui/Button";
import Pill from "@/components/ui/Pill";
import SafeHtml from "@/components/ui/SafeHtml";
import { cn, formatINR, formatISTDate, formatISTDateTime } from "@/lib/utils";

type ListingStatus = "PENDING" | "VERIFIED" | "REJECTED";
type ConfirmAction = "approve" | "reject" | null;

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

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: IconType }) {
    return (
        <div className="flex items-center gap-4 rounded-xl border border-border bg-background p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-neutral-50 text-foreground">
                <Icon size={19} />
            </div>
            <div className="min-w-0">
                <div className="text-2xl font-semibold leading-none text-foreground">{value}</div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
            </div>
        </div>
    );
}

function KycPill({ verified }: { verified: boolean }) {
    return (
        <Pill
            label={verified ? "KYC Verified" : "KYC Incomplete"}
            icon={FiShield}
            variant={verified ? "success" : "warning"}
            size="xs"
        />
    );
}

function Detail({ label, value }: { label: string; value: unknown }) {
    return (
        <div className="min-w-0 rounded-xl border border-border bg-muted/30 p-3">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-foreground">{detailValue(value)}</dd>
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
                <KycPill verified={Boolean(user?.is_verified)} />
                {checks.map((check) => (
                    <Pill
                        key={check.label}
                        label={check.label}
                        icon={check.value ? FiCheck : FiX}
                        variant={check.value ? "success" : "neutral"}
                        size="xs"
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
                            <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-border bg-muted">
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
                                <KycPill verified={Boolean(listing.user?.is_verified)} />
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
                                <Detail label="Base Price" value={formatINR(listing.price)} />
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
                            <DocumentLink href={agreementUrl} title="Signed agreement PDF" meta={listing.verifications.agreementPdf?.public_id} />
                            {listing.videoSrc && <DocumentLink href={listing.videoSrc} title="Uploaded video tour" />}
                        </div>
                    </Section>

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

                    <Section title="Amenities & Add-ons">
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {allAmenities.length > 0 ? allAmenities.map((item) => (
                                    <Pill key={item} label={item} variant="subtle" size="xs" />
                                )) : <span className="text-sm text-muted-foreground">No amenities provided.</span>}
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                {addons.length > 0 ? addons.map((addon, index) => (
                                    <Detail
                                        key={`${addon.name || index}`}
                                        label={String(addon.name || `Add-on ${index + 1}`)}
                                        value={`${formatINR(Number(addon.price || 0))} • Qty ${Number(addon.qty || 0)}`}
                                    />
                                )) : <Detail label="Add-ons" value={null} />}
                            </div>
                        </div>
                    </Section>

                    <Section title="Sets & Packages">
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                            <div className="space-y-3">
                                {listing.sets.length > 0 ? listing.sets.map((set) => (
                                    <Detail key={set.id} label={set.name} value={`${formatINR(set.price)} • ${set.images.length} images`} />
                                )) : <Detail label="Sets" value={listing.hasSets ? "No set data provided" : "Entire studio listing"} />}
                            </div>
                            <div className="space-y-3">
                                {listing.packages.length > 0 ? listing.packages.map((pkg) => (
                                    <Detail
                                        key={pkg.id}
                                        label={pkg.title}
                                        value={`${formatINR(pkg.offeredPrice)} • ${pkg.durationHours} hr • ${pkg.features.join(", ") || "No features"}`}
                                    />
                                )) : <Detail label="Packages" value={null} />}
                            </div>
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
                        <Button
                            label="Reject"
                            variant="destructive"
                            outline
                            disabled={isMutating || listing.status === "REJECTED"}
                            onClick={() => onRequestAction("reject")}
                            data-testid="admin-review-reject"
                        />
                        <Button
                            label="Approve"
                            variant="default"
                            disabled={isMutating || listing.status === "VERIFIED"}
                            onClick={() => onRequestAction("approve")}
                            data-testid="admin-review-approve"
                        />
                    </div>
                </div>
            }
            selfActionButton
        />
    );
}

export default function AdminListingsClient({ listings }: { listings: AdminListingReview[] }) {
    const router = useRouter();
    const [status, setStatus] = useState<"ALL" | ListingStatus>("PENDING");
    const [selected, setSelected] = useState<AdminListingReview | null>(null);
    const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [isPending, startTransition] = useTransition();

    const counts = useMemo(() => ({
        ALL: listings.length,
        PENDING: listings.filter((listing) => listing.status === "PENDING").length,
        VERIFIED: listings.filter((listing) => listing.status === "VERIFIED").length,
        REJECTED: listings.filter((listing) => listing.status === "REJECTED").length,
    }), [listings]);

    const visibleListings = useMemo(
        () => status === "ALL" ? listings : listings.filter((listing) => listing.status === status),
        [listings, status]
    );

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
                router.refresh();
            } else {
                toast.error(result.error || "Failed to update listing");
            }
        });
    };

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">Listing Review</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Review host submissions, verification evidence, and publishing decisions.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label="All Listings" value={counts.ALL} icon={FiLayers} />
                <StatCard label="Pending" value={counts.PENDING} icon={FiClock} />
                <StatCard label="Verified" value={counts.VERIFIED} icon={FiCheck} />
                <StatCard label="Rejected" value={counts.REJECTED} icon={FiX} />
            </div>

            <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-background p-2" role="tablist" aria-label="Listing status filters">
                {STATUS_OPTIONS.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        role="tab"
                        aria-selected={status === option.value}
                        onClick={() => setStatus(option.value)}
                        className={cn(
                            "h-9 rounded-xl px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20",
                            status === option.value
                                ? "bg-neutral-50 text-foreground ring-1 ring-border"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        {option.label} <span className="ml-1 text-xs text-muted-foreground">{counts[option.value]}</span>
                    </button>
                ))}
            </div>

            {visibleListings.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-border bg-background px-6 py-14 text-center">
                    <FiShield className="mb-4 h-8 w-8 text-muted-foreground" />
                    <div className="text-sm font-semibold text-foreground">No listings in this view</div>
                    <p className="mt-1 text-sm text-muted-foreground">Change the status filter to review another queue.</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-background">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted/70">
                                <tr>
                                    {["Listing", "Host", "Status", "Price", "Submitted", "Actions"].map((heading) => (
                                        <th
                                            key={heading}
                                            scope="col"
                                            className={cn(
                                                "px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
                                                heading === "Actions" && "text-right"
                                            )}
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {visibleListings.map((listing) => (
                                    <tr key={listing.id} className="transition hover:bg-muted/35">
                                        <td className="px-5 py-4">
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
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="min-w-52 space-y-1">
                                                <div className="truncate text-sm font-medium text-foreground">{listing.user?.name || "Unknown host"}</div>
                                                <div className="truncate text-xs text-muted-foreground">{listing.user?.email || "No email"}</div>
                                                <KycPill verified={Boolean(listing.user?.is_verified)} />
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <Pill label={listing.status} variant={statusVariant(listing.status)} size="xs" />
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-foreground">{formatINR(listing.price)}</td>
                                        <td className="whitespace-nowrap px-5 py-4 text-sm text-muted-foreground">
                                            {formatISTDate(listing.createdAt, { day: "numeric", month: "short", year: "numeric" })}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button
                                                type="button"
                                                aria-label={`Review ${listing.title}`}
                                                title="Review listing"
                                                data-testid={`review-listing-${listing.id}`}
                                                onClick={() => setSelected(listing)}
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-foreground transition hover:border-foreground/30 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                                            >
                                                <FiEye />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ReviewModal
                listing={selected}
                onClose={() => setSelected(null)}
                onRequestAction={setConfirmAction}
                isMutating={isPending}
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
        </div>
    );
}
