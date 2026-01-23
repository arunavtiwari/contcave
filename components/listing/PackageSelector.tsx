"use client";

import { IoCheckmark } from "react-icons/io5";

import { Package } from "@/types/package";

interface PackageSelectorProps {
    packages: Package[];
    selectedPackageId: string | null;
    onPackageSelect: (packageId: string | null) => void;
    disabled?: boolean;
}

const INR = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
});

export default function PackageSelector({
    packages,
    selectedPackageId,
    onPackageSelect,
    disabled = false,
}: PackageSelectorProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Choose Booking Mode</h3>
            </div>

            <div className="grid gap-3">
                {/* Individual Sets Option */}
                <div
                    onClick={() => !disabled && onPackageSelect(null)}
                    className={`
            relative border rounded-xl p-4 transition cursor-pointer
            ${selectedPackageId === null
                            ? "border-black bg-neutral-50 ring-1 ring-black"
                            : "border-neutral-200 hover:border-neutral-300"
                        }
            ${disabled ? "opacity-60 cursor-not-allowed" : ""}
          `}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium">Individual Sets</h4>
                            <p className="text-sm text-neutral-500 mt-1">
                                Select specific sets and pay for what you use
                            </p>
                        </div>
                        <div
                            className={`
                w-6 h-6 rounded-full border-2 flex items-center justify-center transition
                ${selectedPackageId === null
                                    ? "border-black bg-black text-white"
                                    : "border-neutral-300"
                                }
              `}
                        >
                            {selectedPackageId === null && <IoCheckmark size={16} />}
                        </div>
                    </div>
                </div>

                {/* Packages */}
                {packages.map((pkg) => (
                    <div
                        key={pkg.id}
                        onClick={() => !disabled && onPackageSelect(pkg.id || null)}
                        className={`
              relative border rounded-xl p-4 transition cursor-pointer
              ${selectedPackageId === pkg.id
                                ? "border-black bg-neutral-50 ring-1 ring-black"
                                : "border-neutral-200 hover:border-neutral-300"
                            }
              ${disabled ? "opacity-60 cursor-not-allowed" : ""}
            `}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1 pr-4">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{pkg.title}</h4>
                                    <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full">
                                        Package
                                    </span>
                                </div>
                                {pkg.description && (
                                    <p className="text-sm text-neutral-500 mt-1 line-clamp-2">
                                        {pkg.description}
                                    </p>
                                )}
                                <div className="mt-2 flex items-center gap-3 text-sm">
                                    <span className="text-neutral-600">
                                        {pkg.requiredSetCount || 0} sets included
                                    </span>

                                    {(pkg.fixedAddOn || 0) > 0 && (
                                        <span className="text-green-600 font-medium">
                                            + {INR.format(pkg.fixedAddOn || 0)} flat fee
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div
                                className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center transition
                  ${selectedPackageId === pkg.id
                                        ? "border-black bg-black text-white"
                                        : "border-neutral-300"
                                    }
                `}
                            >
                                {selectedPackageId === pkg.id && <IoCheckmark size={16} />}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
