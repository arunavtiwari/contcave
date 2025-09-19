"use client";

import { useState, useEffect } from "react";
import { Trash2, PlusCircle } from "lucide-react";
import Input from "./Input";

export interface Package {
  title: string;
  originalPrice: number;
  offeredPrice: number;
  features: string[];
  durationHours: number;
}

interface PackagesFormProps {
  value: Package[];
  onChange: (packages: Package[]) => void;
}

export default function PackagesForm({ value, onChange }: PackagesFormProps) {
  const [packages, setPackages] = useState<Package[]>(value || []);

  useEffect(() => {
    setPackages(value || []);
  }, [value]);

  const addPackage = () => {
    const newPkg: Package = {
      title: "",
      originalPrice: 0,
      offeredPrice: 0,
      features: [],
      durationHours: 1,  // default duration
    };
    const updated = [...packages, newPkg];
    setPackages(updated);
    onChange(updated);
  };

  const updatePackage = (index: number, key: keyof Package, val: any) => {
    const updated = [...packages];
    updated[index] = { ...updated[index], [key]: val };
    setPackages(updated);
    onChange(updated);
  };

  const removePackage = (index: number) => {
    const updated = packages.filter((_, i) => i !== index);
    setPackages(updated);
    onChange(updated);
  };

  return (
    <div className="flex flex-col gap-6">
      {packages.map((pkg, idx) => (
        <div
          key={idx}
          className="border rounded-2xl p-6 shadow-sm bg-white relative"
        >
          <button
            type="button"
            onClick={() => removePackage(idx)}
            className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
            aria-label="Remove Package"
          >
            <Trash2 size={20} />
          </button>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
              <Input
                id={`title-${idx}`}
                label="Package Title"
                value={pkg.title}
                onChange={(e) => updatePackage(idx, "title", e.target.value)}
                required
                errors={{}} 
              />
              <Input
                id={`durationHours-${idx}`}
                label="Duration (Hours)"
                type="number"
                value={pkg.durationHours}
                onChange={(e) =>
                  updatePackage(idx, "durationHours", Number(e.target.value))
                }
                required
                errors={{}}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  id={`originalPrice-${idx}`}
                  label="Original Price"
                  type="number"
                  formatPrice
                  value={pkg.originalPrice}
                  onChange={(e) =>
                    updatePackage(idx, "originalPrice", Number(e.target.value))
                  }
                  required
                  errors={{}}
                />
                <Input
                  id={`offeredPrice-${idx}`}
                  label="Offered Price"
                  type="number"
                  formatPrice
                  value={pkg.offeredPrice}
                  onChange={(e) =>
                    updatePackage(idx, "offeredPrice", Number(e.target.value))
                  }
                  required
                  errors={{}}
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <Input
                id={`features-${idx}`}
                label="Features (comma separated)"
                value={pkg.features.join(", ")}
                onChange={(e) =>
                  updatePackage(
                    idx,
                    "features",
                    e.target.value
                      .split(",")
                      .map((f) => f.trim())
                      .filter(Boolean)
                  )
                }
                required
                errors={{}}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addPackage}
        className="flex items-center gap-2 self-start px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
      >
        <PlusCircle size={18} />
        Add Package
      </button>
    </div>
  );
}
