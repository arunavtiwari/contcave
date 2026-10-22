"use client";

import { FiChevronDown } from "react-icons/fi";
import { IoCheckmark } from "react-icons/io5";

import Heading from "@/components/ui/Heading";
import { EQUIPMENT_REVEAL_EVENT, type EquipmentItem, lightingTier, packageEquipmentChip, packageEquipmentFor } from "@/lib/listing/equipment";
import { Package } from "@/types/package";

interface Props {
  packages: Package[];
  onSelect?: (pkg: Package | null) => void;
  selectedPackageId?: string | null;
  hasSets?: boolean;
  /** This listing's visible equipment; packages referencing it render inclusion chips. */
  equipmentItems?: EquipmentItem[];
  equipmentPolicy?: string | null;
}

function scrollToEquipment(equipmentId: string) {
  // The Equipment section may be collapsed; it opens itself and scrolls to the item.
  window.dispatchEvent(new CustomEvent(EQUIPMENT_REVEAL_EVENT, { detail: equipmentId }));
}

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function PackageList({ packages, onSelect, selectedPackageId, hasSets = false, equipmentItems = [], equipmentPolicy = null }: Props) {

  const handleSelect = (pkg: Package) => {
    if (selectedPackageId === pkg.id) {
      onSelect?.(null);
    } else {
      onSelect?.(pkg);
    }
  };

  if (!packages || packages.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <Heading
        title="Available Packages"
        variant="h5"
      />

      <div
        className="grid gap-4"
      >
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            onClick={() => handleSelect(pkg)}
            className={`
              relative border rounded-xl p-4 transition cursor-pointer
              ${selectedPackageId === pkg.id
                ? "border-foreground bg-muted/20"
                : "border-border/50 hover:border-border"
              }
            `}
          >
            <div className="flex items-center gap-4 sm:gap-6">

              <div
                className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center transition shrink-0
                  ${selectedPackageId === pkg.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-neutral-300"
                  }
                `}
              >
                {selectedPackageId === pkg.id && <IoCheckmark size={16} />}
              </div>


              <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-medium text-lg">{pkg.title}</h4>


                  {pkg.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {pkg.description}
                    </p>
                  )}

                  {(() => {
                    const included = packageEquipmentFor(pkg.includedEquipment, equipmentItems, equipmentPolicy);
                    if (included.length === 0) {
                      // Package not migrated to structured equipment yet: keep the free-text bullets.
                      return pkg.features?.length > 0 && (
                        <ul className="mt-2 flex flex-col gap-1 text-muted-foreground list-disc list-inside text-sm">
                          {pkg.features.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      );
                    }
                    // A package that covers every bookable piece of gear gets one line instead of a list.
                    const coversAll = equipmentItems
                      .filter((item) => item.pricing !== "on_request")
                      .every((item) => included.some((entry) => entry.item.id === item.id));
                    return (
                      <div className="mt-2 flex flex-col gap-1.5">
                        {coversAll ? (
                          <p className="flex items-center gap-1.5 text-sm font-medium text-success">
                            <IoCheckmark size={16} aria-hidden="true" />
                            {lightingTier(equipmentItems) === "pro" ? "All pro equipment included" : "All equipment included"}
                          </p>
                        ) : (
                          <details className="group" onClick={(event) => event.stopPropagation()}>
                            <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                              Equipment included ({included.length})
                              <FiChevronDown size={16} aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {included.map(({ item, quantity }) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    scrollToEquipment(item.id);
                                  }}
                                  className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-foreground hover:bg-muted"
                                >
                                  {packageEquipmentChip(item, quantity)}
                                </button>
                              ))}
                            </div>
                          </details>
                        )}
                        {pkg.features?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {pkg.features.map((extra, i) => (
                              <span key={`extra-${i}`} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                                {extra}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-semibold text-foreground">
                      Duration: {pkg.durationHours} hr{pkg.durationHours > 1 ? "s" : ""}
                    </span>

                    {(hasSets && pkg.requiredSetCount && pkg.requiredSetCount > 0) ? (
                      <>
                        <span className="text-muted-foreground/30">•</span>
                        <span className="text-muted-foreground font-medium">
                          {pkg.requiredSetCount} sets included
                        </span>
                      </>
                    ) : null}

                    {(pkg.fixedAddOn || 0) > 0 && (
                      <>
                        <span className="text-muted-foreground/30">•</span>
                        <span className="text-success font-bold">
                          + {INR.format(pkg.fixedAddOn || 0)} flat fee
                        </span>
                      </>
                    )}
                  </div>
                </div>


                <div className="flex items-center gap-2 sm:justify-end">
                  {(pkg.originalPrice || 0) > (pkg.offeredPrice || 0) && (
                    <span className="text-sm text-muted-foreground line-through">
                      {INR.format(pkg.originalPrice || 0)}
                    </span>
                  )}
                  <span className="font-semibold text-foreground text-lg">
                    {INR.format(pkg.offeredPrice || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
