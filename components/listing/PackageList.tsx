"use client";

import React, { useState } from "react";

interface Package {
  id: string;
  title: string;
  originalPrice: number;
  offeredPrice: number;
  features: string[];
  durationHours: number;
}

interface Props {
  packages: Package[];
  onSelect?: (pkg: Package | null) => void;
}

export default function PackageList({ packages, onSelect }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (pkg: Package) => {
    if (selectedId === pkg.id) {
      setSelectedId(null);
      onSelect?.(null);
    } else {
      setSelectedId(pkg.id);
      onSelect?.(pkg);
    }
  };

  if (!packages || packages.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-2xl font-semibold text-gray-900">Available Packages</p>

      <div
        className={`grid gap-6 ${
          packages.length > 1 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
        }`}
      >
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            onClick={() => handleSelect(pkg)}
            className={`border rounded-xl p-6 cursor-pointer transition-all transform ${
              selectedId === pkg.id
                ? "border-black shadow-lg bg-gray-100 scale-105"
                : "border-gray-300 hover:shadow-md hover:bg-gray-50 hover:scale-105"
            }`}
          >
            {/* Header */}
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg text-black">{pkg.title}</h3>
              <div className="text-right">
                <p className="text-sm line-through text-gray-500">₹{pkg.originalPrice}</p>
                <p className="text-lg font-bold text-black">₹{pkg.offeredPrice}</p>
              </div>
            </div>

            {/* Features */}
            {pkg.features?.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1 text-gray-700 list-disc list-inside">
                {pkg.features.map((f, i) => (
                  <li key={i} className="text-sm">{f}</li>
                ))}
              </ul>
            )}

            {/* Duration */}
            <p className="mt-4 text-sm font-medium text-gray-600">
              Duration: {pkg.durationHours} hr{pkg.durationHours > 1 ? "s" : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
