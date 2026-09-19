"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState, useTransition } from "react";
import {
  FiAlertCircle,
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiDownload,
  FiExternalLink,
  FiEye,
  FiHome,
  FiSearch,
  FiShield,
  FiX,
} from "react-icons/fi";
import { toast } from "sonner";

import {
  type AdminOwnerRow,
  type AdminOwnersPageData,
  type AdminOwnerTab,
  getAdminOwnerDetailAction,
  getAdminOwnersOperations,
} from "@/app/actions/adminOwnerActions";
import AdminTabs from "@/components/admin/AdminTabs";
import Modal from "@/components/modals/Modal";
import Button from "@/components/ui/Button";
import Pill from "@/components/ui/Pill";
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
  TableSkeletonRows,
} from "@/components/ui/Table";
import Tooltip from "@/components/ui/Tooltip";
import { downloadCustomCsv } from "@/lib/csv";
import { formatINR, formatISTDate } from "@/lib/utils";

interface AdminOwnersClientProps extends AdminOwnersPageData {
  searchQuery: string;
}

const OWNER_TABS: Array<{ key: AdminOwnerTab; label: string }> = [
  { key: "all", label: "All Owners" },
  { key: "verified", label: "Fully Verified" },
  { key: "pending", label: "Pending Verification" },
  { key: "withListings", label: "Active Hosts" },
  { key: "gstRegistered", label: "GST Registered" },
];

function verificationBadge(owner: AdminOwnerRow) {
  if (owner.isVerified) {
    return { label: "Verified", variant: "success" as const, stageText: "All KYC Passed" };
  }
  if (owner.verificationStage === 3) {
    return { label: "Bank Pending", variant: "warning" as const, stageText: "Stage 3: Bank Review" };
  }
  if (owner.verificationStage === 2) {
    return { label: "Aadhaar Done", variant: "warning" as const, stageText: "Stage 2: Aadhaar Verified" };
  }
  if (owner.verificationStage === 1) {
    return { label: "Contact Only", variant: "warning" as const, stageText: "Stage 1: Contact Verified" };
  }
  return { label: "Unverified", variant: "secondary" as const, stageText: "Stage 0: KYC Incomplete" };
}

interface OwnerDetailState {
  isOpen: boolean;
  isLoading: boolean;
  data: Awaited<ReturnType<typeof getAdminOwnerDetailAction>>["data"] | null;
  error: string | null;
}

export default function AdminOwnersClient(props: AdminOwnersClientProps) {
  const [data, setData] = useState<AdminOwnersPageData>(props);
  const [optimisticTab, setOptimisticTab] = useState<AdminOwnerTab>(props.activeTab);
  const [search, setSearch] = useState<string>(props.searchQuery);
  const [isNavigating, startNavTransition] = useTransition();

  const [detailModal, setDetailModal] = useState<OwnerDetailState>({
    isOpen: false,
    isLoading: false,
    data: null,
    error: null,
  });

  // Pre-paint state sync pattern (prevents post-paint flicker and wasted renders)
  const [prevProps, setPrevProps] = useState(props);
  if (props !== prevProps) {
    setPrevProps(props);
    setData(props);
    setOptimisticTab(props.activeTab);
    setSearch(props.searchQuery);
  }

  const navigateTab = (
    nextTab: AdminOwnerTab,
    nextPage = 1,
    nextPageSize = data.pageSize,
    nextSearch = search
  ) => {
    setOptimisticTab(nextTab);
    const searchParams = new URLSearchParams({
      tab: nextTab,
      page: String(nextPage),
      pageSize: String(nextPageSize),
    });
    if (nextSearch.trim()) {
      searchParams.set("q", nextSearch.trim());
    }

    window.history.pushState(null, "", `/admin/dashboard/owners?${searchParams.toString()}`);

    startNavTransition(async () => {
      try {
        const res = await getAdminOwnersOperations({
          tab: nextTab,
          page: nextPage,
          pageSize: nextPageSize,
          search: nextSearch.trim(),
        });
        setData(res);
      } catch {
        toast.error("Failed to load space owners");
      }
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateTab(optimisticTab, 1, data.pageSize, search);
  };

  const handleSearchClear = () => {
    setSearch("");
    navigateTab(optimisticTab, 1, data.pageSize, "");
  };

  const openOwnerDetail = async (ownerId: string) => {
    setDetailModal({ isOpen: true, isLoading: true, data: null, error: null });
    try {
      const res = await getAdminOwnerDetailAction({ ownerId });
      if (!res.success || !res.data) {
        setDetailModal({
          isOpen: true,
          isLoading: false,
          data: null,
          error: res.error || "Failed to load owner details",
        });
        return;
      }
      setDetailModal({ isOpen: true, isLoading: false, data: res.data, error: null });
    } catch (err) {
      setDetailModal({
        isOpen: true,
        isLoading: false,
        data: null,
        error: err instanceof Error ? err.message : "Failed to load owner details",
      });
    }
  };

  const handleExportCsv = () => {
    if (data.owners.length === 0) return;

    const headers = [
      "Owner ID",
      "Name",
      "Email",
      "Phone",
      "City",
      "Verification Status",
      "Verification Stage",
      "Total Spaces",
      "Active Spaces",
      "Bank Name",
      "Account Number (Masked)",
      "IFSC Code",
      "Company Name",
      "GSTIN",
      "Cashfree Vendor ID",
      "Total Bookings",
      "Total Revenue (INR)",
      "Joined Date",
    ];

    const rows = data.owners.map((o) => [
      o.id,
      o.name,
      o.email,
      o.phone,
      o.location,
      o.isVerified ? "Verified" : "Pending",
      `Stage ${o.verificationStage}`,
      o.listingsCount,
      o.activeListingsCount,
      o.bankName || "Not Set",
      o.accountNumberMasked || "Not Set",
      o.ifscCode || "Not Set",
      o.companyName || "Not Set",
      o.gstin || "Non-GST",
      o.cashfreeVendorId || "Not Registered",
      o.completedBookingsCount,
      o.totalRevenue,
      formatISTDate(o.createdAt),
    ]);

    downloadCustomCsv(`contcave-space-owners-${optimisticTab}.csv`, headers, rows);
  };

  const paginationFooter = (
    <TablePagination
      page={data.page}
      pageSize={data.pageSize}
      total={data.total}
      pageSizeOptions={[10, 20, 50]}
      label="space owners"
      hrefForPage={(page, size) =>
        `/admin/dashboard/owners?tab=${optimisticTab}&page=${page}&pageSize=${size || data.pageSize}${
          search ? `&q=${encodeURIComponent(search)}` : ""
        }`
      }
      onPageSizeChange={(newSize) => navigateTab(optimisticTab, 1, newSize, search)}
      onPageChange={(page) => navigateTab(optimisticTab, page, data.pageSize, search)}
    />
  );

  return (
    <div className="space-y-6">
      {/* HEADER BAR: SEARCH & EXPORT */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:max-w-md">
          <div className="relative flex items-center">
            <FiSearch className="absolute left-3.5 text-muted-foreground" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by owner name, email, phone, studio…"
              className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
            {search && (
              <button
                type="button"
                onClick={handleSearchClear}
                className="absolute right-2.5 text-muted-foreground hover:text-foreground"
              >
                <FiX size={14} />
              </button>
            )}
          </div>
        </form>

        <div className="flex items-center gap-3">
          <Button
            label="Export CSV"
            icon={FiDownload}
            fit
            size="sm"
            outline
            onClick={handleExportCsv}
            disabled={data.owners.length === 0 || isNavigating}
          />
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Total Space Owners" value={data.summary.totalOwners} />
        <StatCard label="Fully Verified" value={data.summary.verifiedOwners} />
        <StatCard label="Pending Verification" value={data.summary.pendingOwners} />
        <StatCard label="Active Studios" value={data.summary.activeStudios} />
        <StatCard label="Completed Bookings" value={data.summary.totalBookings} />
        <StatCard label="Gross Revenue (GMV)" value={formatINR(data.summary.totalRevenue)} />
      </div>

      {/* TABS */}
      <AdminTabs
        activeId={optimisticTab}
        ariaLabel="Space owner views"
        onSelect={(nextTab) => navigateTab(nextTab as AdminOwnerTab, 1, data.pageSize, search)}
        items={OWNER_TABS.map((item) => ({
          id: item.key,
          label: item.label,
          count: data.tabCounts[item.key],
          href: `/admin/dashboard/owners?tab=${item.key}&page=1${
            search ? `&q=${encodeURIComponent(search)}` : ""
          }`,
        }))}
      />

      {/* TABLE */}
      {data.owners.length > 0 || isNavigating ? (
        <Table footer={paginationFooter}>
          <TableHeader>
            <TableRow>
              <TableHead>Owner</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-center">Verification</TableHead>
              <TableHead className="text-center">Studios</TableHead>
              <TableHead>Bank / Payout</TableHead>
              <TableHead className="text-center">GST Status</TableHead>
              <TableHead className="text-right">Bookings & GMV</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isNavigating ? (
              <TableSkeletonRows rows={Math.min(data.pageSize, 10)} columns={9} />
            ) : (
              data.owners.map((owner) => {
                const badge = verificationBadge(owner);

                return (
                  <TableRow key={owner.id}>
                    {/* Owner Info */}
                    <TableCell className="max-w-56">
                      <div className="flex items-center gap-2.5">
                        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted/60 text-xs font-semibold text-foreground">
                          {owner.profileImage ? (
                            <Image
                              src={owner.profileImage}
                              alt={owner.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            owner.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <Tooltip content={owner.name}>
                            <div className="truncate font-medium text-foreground">{owner.name}</div>
                          </Tooltip>
                          <div className="truncate text-xs text-muted-foreground">{owner.email}</div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact & Location */}
                    <TableCell className="whitespace-nowrap">
                      <div className="text-xs font-medium text-foreground">{owner.phone || "-"}</div>
                      <div className="text-xs text-muted-foreground">{owner.location || "-"}</div>
                    </TableCell>

                    {/* Verification Status */}
                    <TableCell className="text-center whitespace-nowrap">
                      <Tooltip content={badge.stageText}>
                        <div>
                          <Pill label={badge.label} variant={badge.variant} size="xs" />
                        </div>
                      </Tooltip>
                    </TableCell>

                    {/* Studios Count */}
                    <TableCell className="text-center whitespace-nowrap">
                      <Tooltip
                        content={
                          owner.listings.length > 0
                            ? owner.listings.map((l) => l.title).join(", ")
                            : "No spaces listed yet"
                        }
                      >
                        <div className="inline-flex items-center gap-1">
                          <span className="font-semibold text-foreground">{owner.listingsCount}</span>
                          <span className="text-xs text-muted-foreground">
                            ({owner.activeListingsCount} active)
                          </span>
                        </div>
                      </Tooltip>
                    </TableCell>

                    {/* Bank & Payouts */}
                    <TableCell className="max-w-44">
                      {owner.hasPaymentDetails ? (
                        <div>
                          <div className="truncate text-xs font-medium text-foreground">
                            {owner.bankName || "Bank Added"}
                          </div>
                          <div className="truncate font-mono text-xs text-muted-foreground">
                            {owner.accountNumberMasked}
                          </div>
                          {owner.cashfreeVendorId && (
                            <span className="text-[10px] text-emerald-600 font-mono">
                              CF: {owner.cashfreeVendorId.slice(0, 10)}…
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No Bank Details</span>
                      )}
                    </TableCell>

                    {/* GST Status */}
                    <TableCell className="text-center whitespace-nowrap">
                      {owner.gstin ? (
                        <Tooltip content={`GSTIN: ${owner.gstin}`}>
                          <div>
                            <Pill label={owner.gstin} variant="outline" size="xs" className="font-mono text-[11px]" />
                          </div>
                        </Tooltip>
                      ) : (
                        <Pill label="Non-GST" variant="secondary" size="xs" />
                      )}
                    </TableCell>

                    {/* Bookings & GMV */}
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="font-medium text-foreground">{formatINR(owner.totalRevenue)}</div>
                      <div className="text-xs text-muted-foreground">
                        {owner.completedBookingsCount} bookings
                      </div>
                    </TableCell>

                    {/* Joined Date */}
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatISTDate(owner.createdAt)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        label="View"
                        icon={FiEye}
                        size="sm"
                        outline
                        fit
                        onClick={() => openOwnerDetail(owner.id)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      ) : (
        <EmptyTable label="No space owners found matching the selected criteria." />
      )}

      {/* OWNER DETAIL MODAL */}
      <OwnerDetailModal
        state={detailModal}
        onClose={() => setDetailModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 min-h-5 wrap-break-word text-sm text-foreground">{value || "-"}</div>
    </div>
  );
}

function DetailSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-background p-4 sm:p-5">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        {Icon && (
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon size={14} />
          </div>
        )}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

function OwnerDetailModal({
  state,
  onClose,
}: {
  state: OwnerDetailState;
  onClose: () => void;
}) {
  if (!state.isOpen) return null;

  const owner = state.data;

  const modalBody = (
    <div className="space-y-5">
      {state.isLoading && (
        <div className="py-16 text-center text-sm text-muted-foreground animate-pulse">
          Loading space owner profile & properties…
        </div>
      )}

      {state.error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <FiAlertCircle className="mt-0.5 shrink-0" size={16} />
          <span>{state.error}</span>
        </div>
      )}

      {!state.isLoading && owner && (
        <div className="space-y-5">
          {/* PROFILE SUMMARY HEADER */}
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted font-semibold text-foreground">
                {owner.profileImage ? (
                  <Image
                    src={owner.profileImage}
                    alt={owner.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  owner.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">{owner.name}</h2>
                <p className="text-xs text-muted-foreground">{owner.email} | {owner.phone || "No phone"}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Pill
                label={owner.isVerified ? "Verified Host" : `Stage ${owner.verificationStage}`}
                variant={owner.isVerified ? "success" : "warning"}
                size="sm"
              />
              {owner.googleCalendarConnected && (
                <Pill label="Google Calendar" variant="outline" size="sm" />
              )}
            </div>
          </div>

          {/* KYC VERIFICATION BREAKDOWN */}
          <DetailSection title="Verification & KYC Status" icon={FiShield}>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="flex items-center gap-2 rounded-lg border border-border p-2.5 bg-muted/10">
                {owner.emailVerified ? (
                  <FiCheck className="text-emerald-500" size={16} />
                ) : (
                  <FiX className="text-muted-foreground" size={16} />
                )}
                <div>
                  <div className="text-xs font-medium text-foreground">Email</div>
                  <div className="text-[11px] text-muted-foreground">
                    {owner.emailVerified ? "Verified" : "Pending"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-border p-2.5 bg-muted/10">
                {owner.phoneVerified ? (
                  <FiCheck className="text-emerald-500" size={16} />
                ) : (
                  <FiX className="text-muted-foreground" size={16} />
                )}
                <div>
                  <div className="text-xs font-medium text-foreground">Phone</div>
                  <div className="text-[11px] text-muted-foreground">
                    {owner.phoneVerified ? "Verified" : "Pending"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-border p-2.5 bg-muted/10">
                {owner.aadhaarVerified ? (
                  <FiCheck className="text-emerald-500" size={16} />
                ) : (
                  <FiX className="text-muted-foreground" size={16} />
                )}
                <div>
                  <div className="text-xs font-medium text-foreground">Aadhaar KYC</div>
                  <div className="text-[11px] text-muted-foreground">
                    {owner.aadhaarVerified ? `Last 4: ${owner.aadhaarLast4 || "••••"}` : "Unverified"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-border p-2.5 bg-muted/10">
                {owner.bankVerified ? (
                  <FiCheck className="text-emerald-500" size={16} />
                ) : (
                  <FiX className="text-muted-foreground" size={16} />
                )}
                <div>
                  <div className="text-xs font-medium text-foreground">Bank Account</div>
                  <div className="text-[11px] text-muted-foreground">
                    {owner.bankVerified ? "Name Matched" : "Unverified"}
                  </div>
                </div>
              </div>
            </div>
          </DetailSection>

          {/* BANKING & PAYOUT CONFIGURATION */}
          <DetailSection title="Banking & Payout Details" icon={FiBriefcase}>
            {owner.paymentDetails ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <DetailItem label="Bank Name" value={owner.paymentDetails.bankName} />
                <DetailItem label="Account Holder" value={owner.paymentDetails.accountHolderName} />
                <DetailItem label="Account Number" value={owner.paymentDetails.accountNumberMasked} />
                <DetailItem label="IFSC Code" value={owner.paymentDetails.ifscCode} />
                <DetailItem label="Company Name" value={owner.paymentDetails.companyName} />
                <DetailItem
                  label="GSTIN"
                  value={
                    owner.paymentDetails.gstin ? (
                      <span className="font-mono text-xs">{owner.paymentDetails.gstin}</span>
                    ) : (
                      "Non-GST"
                    )
                  }
                />
                <div className="sm:col-span-2">
                  <DetailItem label="Billing / Studio Address" value={owner.paymentDetails.companyAddress} />
                </div>
                <DetailItem
                  label="Cashfree Vendor ID"
                  value={
                    owner.paymentDetails.cashfreeVendorId ? (
                      <span className="font-mono text-xs text-primary">
                        {owner.paymentDetails.cashfreeVendorId}
                      </span>
                    ) : (
                      "Not Registered"
                    )
                  }
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No payment or bank details registered for this owner yet.
              </p>
            )}
          </DetailSection>

          {/* SPACES & STUDIOS LIST */}
          <DetailSection title={`Studios & Spaces (${owner.listings.length})`} icon={FiHome}>
            {owner.listings.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {owner.listings.map((listing) => (
                  <div
                    key={listing.id}
                    className="rounded-lg border border-border bg-muted/10 p-3.5 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm text-foreground">
                        {listing.title}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Pill
                          label={listing.status}
                          variant={listing.status === "VERIFIED" ? "success" : "warning"}
                          size="xs"
                        />
                        {listing.active && (
                          <Pill label="Active" variant="success" size="xs" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Rate: {formatINR(listing.price)}/hr</span>
                      {listing.carpetArea && <span>{listing.carpetArea} sq.ft</span>}
                      <span>{listing.packagesCount} packages</span>
                    </div>

                    <div className="text-xs text-muted-foreground truncate">
                      {listing.locationValue}
                    </div>

                    <div className="pt-1">
                      <Link
                        href={`/listings/${listing.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <span>View public page</span>
                        <FiExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No studio spaces listed yet.</p>
            )}
          </DetailSection>

          {/* RECENT BOOKINGS BREAKDOWN */}
          <DetailSection title="Recent Bookings on Owner Spaces" icon={FiCalendar}>
            {owner.listings.some((l) => l.reservations.length > 0) ? (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {owner.listings.flatMap((l) =>
                  l.reservations.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-lg border border-border p-2.5 text-xs"
                    >
                      <div>
                        <span className="font-mono font-semibold text-foreground">
                          {r.bookingId}
                        </span>
                        <span className="ml-2 text-muted-foreground">({l.title})</span>
                        <div className="text-[11px] text-muted-foreground">
                          {formatISTDate(r.startDate)} | {r.startTime} - {r.endTime}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-foreground">{formatINR(r.totalPrice)}</div>
                        <Pill label={r.status} variant="outline" size="xs" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No bookings recorded yet.</p>
            )}
          </DetailSection>
        </div>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={state.isOpen}
      onCloseAction={onClose}
      onSubmitAction={onClose}
      title={owner ? `Space Owner: ${owner.name}` : "Owner Details"}
      customWidth="max-w-4xl"
      body={modalBody}
      selfActionButton
      actionLabel=""
    />
  );
}
