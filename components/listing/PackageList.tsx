"use client";

import { IoCheckmark } from "react-icons/io5";

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
      <p className="text-xl font-semibold">Available Packages</p>

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
                ? "border-black bg-neutral-50 ring-1 ring-black"
                : "border-neutral-200 hover:border-neutral-300"
              }
            `}
          >
            <div className="flex items-center gap-4 sm:gap-6">

              <div
                className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center transition shrink-0
                  ${selectedPackageId === pkg.id
                    ? "border-black bg-black text-white"
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
                    <p className="text-sm text-neutral-500 mt-1 line-clamp-2">
                      {pkg.description}
                    </p>
                  )}

                  {pkg.features?.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1 text-neutral-600 list-disc list-inside text-sm">
                      {pkg.features.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-medium text-neutral-700">
                      Duration: {pkg.durationHours} hr{pkg.durationHours > 1 ? "s" : ""}
                    </span>

                    {(isMultiSets && pkg.requiredSetCount && pkg.requiredSetCount > 0) ? (
                      <>
                        <span className="font-black text-xl leading-none text-neutral-300">•</span>
                        <span className="text-neutral-600">
                          {pkg.requiredSetCount} sets included
                        </span>
                      </>
                    ) : null}

                    {(pkg.fixedAddOn || 0) > 0 && (
                      <>
                        <span className="font-black text-xl leading-none text-neutral-300">•</span>
                        <span className="text-green-600 font-medium">
                          + {INR.format(pkg.fixedAddOn || 0)} flat fee
                        </span>
                      </>
                    )}
                  </div>
                </div>


                <div className="flex items-center gap-2 sm:justify-end">
                  {(pkg.originalPrice || 0) > (pkg.offeredPrice || 0) && (
                    <span className="text-sm text-neutral-500 line-through">
                      {INR.format(pkg.originalPrice || 0)}
                    </span>
                  )}
                  <span className="font-semibold text-black text-lg">
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
