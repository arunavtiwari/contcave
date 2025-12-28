"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Plus } from "lucide-react";
import Input from "./Input";

import { Package } from "@/types/package";

interface PackagesFormProps {
  value: Package[];
  onChange: (packages: Package[]) => void;
}

export default function PackagesForm({ value, onChange }: PackagesFormProps) {
  const [packages, setPackages] = useState<Package[]>(value || []);

  // Sync external changes
  useEffect(() => {
    setPackages(value || []);
  }, [value]);

  const updatePackages = useCallback(
    (updated: Package[]) => {
      setPackages(updated);
      onChange(updated);
    },
    [onChange]
  );

  const addPackage = () => {
    updatePackages([
      ...packages,
      { id: undefined, title: "", originalPrice: 0, offeredPrice: 0, features: [], durationHours: 1 },
    ]);
  };

  const updatePackage = (index: number, key: keyof Package, val: string | number | string[]) => {
    const updated = packages.map((pkg, i) => (i === index ? { ...pkg, [key]: val } : pkg));
    updatePackages(updated);
  };

  const removePackage = (index: number) => {
    const updated = packages.filter((_, i) => i !== index);
    updatePackages(updated);
  };

  return (
    <div className="flex flex-col gap-8">
      {packages.map((pkg, idx) => (
        <div
          key={idx}
          className="border border-black rounded-xl p-6 relative flex flex-col gap-4 bg-white shadow-xs"
        >
          {/* Bin / Remove button */}
          <button
            type="button"
            onClick={() => removePackage(idx)}
            className="absolute -top-3 -right-3 bg-white border border-black p-2 hover:bg-black hover:text-white transition z-10 rounded-md"
            aria-label="Remove Package"
          >
            <Trash2 size={16} />
          </button>

          {/* Package Title */}
          <Input
            id={`title-${idx}`}
            label="Package Title"
            value={pkg.title}
            onChange={(e) => updatePackage(idx, "title", e.target.value)}
            required
            errors={{}}
          />

          {/* Duration */}
          <Input
            id={`duration-${idx}`}
            label="Duration (Hours)"
            type="number"
            value={pkg.durationHours}
            onChange={(e) => updatePackage(idx, "durationHours", Number(e.target.value))}
            required
            errors={{}}
          />
          <p className="text-xs text-neutral-500">Minimum duration is 1 hour</p>

          {/* Price inputs */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1">
              <Input
                id={`original-${idx}`}
                label="Original Price"
                type="number"
                formatPrice
                value={pkg.originalPrice}
                onChange={(e) => updatePackage(idx, "originalPrice", Number(e.target.value))}
                required
                errors={{}}
              />
              <p className="text-xs text-neutral-500">Price before discount</p>
            </div>

            <div className="flex-1">
              <Input
                id={`offered-${idx}`}
                label="Offered Price"
                type="number"
                formatPrice
                value={pkg.offeredPrice}
                onChange={(e) => updatePackage(idx, "offeredPrice", Number(e.target.value))}
                required
                errors={{}}
              />
              <p className="text-xs text-neutral-500">Discounted price</p>
            </div>
          </div>

          {/* Features tag-style input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Features</label>
            <div className="flex flex-wrap gap-2">
              {pkg.features.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 bg-gray-100 border border-neutral-300 px-2 py-1 rounded-md"
                >
                  <span className="text-sm">{f}</span>
                  <button
                    type="button"
                    onClick={() =>
                      updatePackage(
                        idx,
                        "features",
                        pkg.features.filter((_, fi) => fi !== i)
                      )
                    }
                    className="text-red-500 hover:text-red-700 font-bold"
                    aria-label="Remove feature"
                  >
                    x
                  </button>
                </div>
              ))}
              <input
                type="text"
                placeholder="Add feature"
                className="outline-none px-2 py-1 border border-neutral-300 rounded-md"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim() !== "") {
                    e.preventDefault();
                    updatePackage(idx, "features", [
                      ...pkg.features,
                      e.currentTarget.value.trim(),
                    ]);
                    e.currentTarget.value = "";
                  }
                }}
              />
            </div>
            <p className="text-xs text-neutral-500">Press Enter to add a feature</p>
          </div>
        </div>
      ))}

      {/* Add Package button */}
      <button
        type="button"
        onClick={addPackage}
        className="flex items-center gap-2 self-start px-5 py-3 border border-black text-black rounded-lg hover:bg-black hover:text-white transition"
      >
        <Plus size={18} />
        Add Package
      </button>
    </div>
  );
}
