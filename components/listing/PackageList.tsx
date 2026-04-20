"use client";

import { IoCheckmark } from "react-icons/io5";

import Heading from "@/components/ui/Heading";
import { Package } from "@/types/package";

interface Props {
  packages: Package[];
  onSelect?: (pkg: Package | null) => void;
  selectedPackageId?: string | null;
  isMultiSets?: boolean;
}

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function PackageList({ packages, onSelect, selectedPackageId, isMultiSets = false }: Props) {

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
                ? "border-foreground bg-muted/20 ring-1 ring-foreground shadow-md"
                : "border-border/50 hover:border-border bg-background shadow-sm hover:shadow-md"
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

                  {pkg.features?.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1 text-muted-foreground list-disc list-inside text-sm">
                      {pkg.features.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-semibold text-foreground">
                      Duration: {pkg.durationHours} hr{pkg.durationHours > 1 ? "s" : ""}
                    </span>

                    {(isMultiSets && pkg.requiredSetCount && pkg.requiredSetCount > 0) ? (
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

