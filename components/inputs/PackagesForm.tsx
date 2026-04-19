"use client";

import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import { useCallback, useEffect, useState } from "react";

import Checkbox from "@/components/ui/Checkbox";
import Input from "@/components/ui/Input";
import { Package } from "@/types/package";
import { ListingSet } from "@/types/set";



interface PackagesFormProps {
  value: Package[];
  onChange: (packages: Package[]) => void;
  availableSets?: ListingSet[];
}

export default function PackagesForm({ value, onChange, availableSets = [] }: PackagesFormProps) {
  const [packages, setPackages] = useState<Package[]>(value || []);


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
      {
        id: undefined,
        title: "",
        originalPrice: 0,
        offeredPrice: 0,
        features: [],
        durationHours: 1,
        requiredSetCount: null,

        fixedAddOn: null,
        eligibleSetIds: [],
        isActive: true
      },
    ]);
  };

  const updatePackage = (index: number, key: keyof Package, val: string | number | string[] | boolean | null) => {
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
          className="border border-foreground rounded-xl p-6 relative flex flex-col gap-4 bg-background "
        >

          <button
            type="button"
            onClick={() => removePackage(idx)}
            className="absolute -top-3 -right-3 bg-background border border-foreground p-2 hover:bg-foreground hover:text-background transition z-10 rounded-md"
            aria-label="Remove Package"
          >
            <Trash2 size={16} />
          </button>


          <div className="w-full">

            <Input
              id={`title-${idx}`}
              label="Package Title"
              placeholder="e.g. Full Day Shoot"
              value={pkg.title}
              onChange={(e) => updatePackage(idx, "title", e.target.value)}
              required
              errors={{}}
            />
          </div>


          <div className="w-full">

            <Input
              id={`duration-${idx}`}
              label="Duration (Hours)"
              type="number"
              placeholder="8"
              value={pkg.durationHours}
              onChange={(e) => updatePackage(idx, "durationHours", Number(e.target.value))}
              required
              errors={{}}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
            />
            <p className="text-xs text-muted-foreground mt-1">Minimum duration is 1 hour</p>
          </div>


          <div className="flex gap-4 flex-wrap">
            <div className="flex-1">

              <Input
                id={`original-${idx}`}
                label="Original Price"
                type="number"
                formatPrice
                placeholder="10000"
                value={pkg.originalPrice}
                onChange={(e) => updatePackage(idx, "originalPrice", Number(e.target.value))}
                required
                errors={{}}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
              />
              <p className="text-xs text-muted-foreground mt-1">Price before discount</p>
            </div>

            <div className="flex-1">

              <Input
                id={`offered-${idx}`}
                label="Offered Price"
                type="number"
                formatPrice
                placeholder="8000"
                value={pkg.offeredPrice}
                onChange={(e) => updatePackage(idx, "offeredPrice", Number(e.target.value))}
                required
                errors={{}}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
              />
              <p className="text-xs text-muted-foreground mt-1">Discounted price</p>
            </div>
          </div>


          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Features</label>
            <div className="flex flex-wrap gap-2">
              {pkg.features.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 bg-muted border border-border px-2 py-1 rounded-md"
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
                    className="text-destructive hover:text-destructive/80 font-bold"
                    aria-label="Remove feature"
                  >
                    x
                  </button>
                </div>
              ))}
              <input
                type="text"
                placeholder="Add feature"
                className="outline-none px-2 py-1 border border-border rounded-md"
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
            <p className="text-xs text-muted-foreground">Press Enter to add a feature</p>
          </div>


          {availableSets.length > 0 && (
            <div className="border-t pt-4 mt-2">
              <div className="flex items-center gap-2 mb-4">
                <Checkbox
                  id={`has-sets-${idx}`}
                  label="Include Set Configuration"
                  checked={pkg.requiredSetCount !== null && pkg.requiredSetCount !== undefined}
                  onCheckedChange={(checked) => {
                    const updated = packages.map((p, i) =>
                      i === idx
                        ? {
                          ...p,
                          requiredSetCount: checked ? 1 : null,
                          fixedAddOn: checked ? 0 : null,
                          eligibleSetIds: [],
                        }
                        : p
                    );
                    updatePackages(updated);
                  }}
                />
              </div>

              {pkg.requiredSetCount !== null && pkg.requiredSetCount !== undefined && (
                <div className="flex flex-col gap-4 pl-6 border-l-2 border-border">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex flex-col gap-1">

                      <Input
                        id={`req-sets-${idx}`}
                        label="Number of Sets Included"
                        type="number"
                        placeholder="1"
                        value={pkg.requiredSetCount || 1}
                        onChange={(e) => updatePackage(idx, "requiredSetCount", Math.max(1, parseInt(e.target.value) || 1))}
                        required
                        errors={{}}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      />
                      <p className="text-xs text-muted-foreground">How many sets are included in this package price</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}


      <button
        type="button"
        onClick={addPackage}
        className="flex items-center gap-2 self-start px-5 py-3 border border-foreground text-foreground rounded-lg hover:bg-foreground hover:text-background transition"
      >
        <Plus size={18} />
        Add Package
      </button>
    </div>
  );
}
