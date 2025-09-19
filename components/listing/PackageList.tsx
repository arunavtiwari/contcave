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
    <div className="flex flex-col gap-4">
      <p className="text-xl font-semibold">Available Packages</p>

      <div
        className={`grid gap-4 ${
          packages.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`border rounded-xl p-4 cursor-pointer transition-shadow ${
              selectedId === pkg.id
                ? "border-blue-600 shadow-md"
                : "border-gray-300"
            }`}
            onClick={() => handleSelect(pkg)}
          >
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">{pkg.title}</h3>
              <div className="text-right">
                <p className="text-sm line-through text-gray-400">
                  ₹{pkg.originalPrice}
                </p>
                <p className="text-lg font-bold">₹{pkg.offeredPrice}</p>
              </div>
            </div>

            {pkg.features?.length > 0 && (
              <ul className="text-sm text-neutral-500 mt-2 list-disc list-inside">
                {pkg.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            )}

            <p className="text-sm text-neutral-600 mt-1">
              Duration: {pkg.durationHours} hr
              {pkg.durationHours > 1 ? "s" : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
