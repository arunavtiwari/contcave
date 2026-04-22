"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import Checkbox from "@/components/inputs/Checkbox";
import Input from "@/components/inputs/Input";
import Button from "@/components/ui/Button";
import Pill from "@/components/ui/Pill";
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
          className="border border-border rounded-2xl p-6 relative flex flex-col gap-5 bg-background shadow-sm transition-all duration-300"
        >
          <div className="absolute -top-3 -right-3 z-10">
            <Button
              variant="ghost"
              size="sm"
              rounded
              onClick={() => removePackage(idx)}
              classNames="bg-background border-border text-destructive hover:bg-destructive hover:text-background w-10 h-10 p-0 shadow-sm"
              icon={Trash2}
            />
          </div>

          <div className="flex flex-col gap-5">
            <Input
              id={`title-${idx}`}
              label="Package Title"
              placeholder="e.g. Full Day Shoot"
              value={pkg.title}
              onChange={(e) => updatePackage(idx, "title", e.target.value)}
              required
            />

            {/* Duration, Original Price, Offered Price */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Input
                id={`duration-${idx}`}
                label="Duration (Hours)"
                type="number"
                placeholder="8"
                value={pkg.durationHours}
                onNumberChange={(val) => updatePackage(idx, "durationHours", val)}
                required
                description="Minimum duration is 1 hour"
              />

              <Input
                id={`original-${idx}`}
                label="Original Price"
                type="number"
                formatPrice
                placeholder="10000"
                value={pkg.originalPrice}
                onNumberChange={(val) => updatePackage(idx, "originalPrice", val)}
                required
                description="Price before discount"
              />

              <Input
                id={`offered-${idx}`}
                label="Offered Price"
                type="number"
                formatPrice
                placeholder="8000"
                value={pkg.offeredPrice}
                onNumberChange={(val) => updatePackage(idx, "offeredPrice", val)}
                required
                description="Discounted price"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Features</label>
            <div className="flex flex-wrap gap-2 min-h-11 p-2 rounded-xl bg-muted/30 border border-dashed border-border/60">
              {pkg.features.map((f, i) => (
                <Pill
                  key={i}
                  label={f}
                  variant="card-feature"
                  size="sm"
                  onClick={() =>
                    updatePackage(
                      idx,
                      "features",
                      pkg.features.filter((_, fi) => fi !== i)
                    )
                  }
                  className="group"
                  icon={X}
                />
              ))}
              <Input
                id={`new-feature-${idx}`}
                placeholder="Type and press Enter..."
                className="flex-1 min-w-37.5 bg-transparent border-none focus:ring-0 h-9 px-2 shadow-none"
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
            <p className="text-[11px] text-muted-foreground px-1 italic">Press Enter to add each feature</p>
          </div>

          {availableSets.length > 0 && (
            <div className="border-t border-border/50 pt-6 mt-2">
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
                <div className="pl-6 border-l-2 border-border/30">
                  <Input
                    id={`req-sets-${idx}`}
                    label="Number of Sets Included"
                    type="number"
                    placeholder="1"
                    value={pkg.requiredSetCount || 1}
                    onNumberChange={(val) => updatePackage(idx, "requiredSetCount", Math.max(1, val))}
                    required
                    description="How many sets are included in this package price"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addPackage}
        label="Add New Package"
        icon={Plus}
        fit
      />
    </div>
  );
}

