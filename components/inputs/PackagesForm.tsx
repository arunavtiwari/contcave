"use client";

import { useCallback, useEffect, useState } from "react";
import { IoAdd, IoClose, IoTrashOutline } from "react-icons/io5";

import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Pill from "@/components/ui/Pill";
import type { EquipmentItem } from "@/lib/listing/equipment";
import { SETS_REQUIRE_PACKAGE_MESSAGE } from "@/schemas/listing";
import { Package } from "@/types/package";
import { ListingSet } from "@/types/set";

const REQUIRED_FOR_SETS_HINT = `${SETS_REQUIRE_PACKAGE_MESSAGE}. Guests who want the entire studio book one of these.`;

interface PackagesFormProps {
  value: Package[];
  onChange: (packages: Package[]) => void;
  availableSets?: ListingSet[];
  /** This listing's equipment, so a package can include specific items. */
  equipmentItems?: EquipmentItem[];
  label?: string;
  description?: string;
  required?: boolean;
  variant?: "vertical" | "horizontal";
  error?: string;
  id?: string;
}

export default function PackagesForm({
  value,
  onChange,
  availableSets = [],
  equipmentItems = [],
  label,
  description,
  required,
  variant = "vertical",
  error,
  id = "packages-form",
}: PackagesFormProps) {
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

  const setIncludedEquipment = (index: number, refs: { equipmentId: string; quantity: number }[]) => {
    updatePackages(packages.map((pkg, i) => (i === index ? { ...pkg, includedEquipment: refs } : pkg)));
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
    <FormField
      id={id}
      label={label}
      description={description ?? (required ? REQUIRED_FOR_SETS_HINT : undefined)}
      required={required}
      error={error}
      variant={variant}
      align="start"
    >
      <div className="flex flex-col gap-5 w-full overflow-visible pt-3 pr-3">
        {packages.map((pkg, idx) => (
          <div
            key={idx}
            className="border border-border rounded-2xl p-5 sm:p-6 relative flex flex-col gap-5 bg-background transition-all duration-300 overflow-visible"
          >
            <div className="absolute -top-3 -right-3 z-10">
              <Button
                variant="ghost"
                rounded
                onClick={() => removePackage(idx)}
                className="h-9 w-9 bg-background text-destructive shadow-xs hover:shadow-sm"
                icon={IoTrashOutline}
                aria-label={`Remove package ${idx + 1}`}
                title="Remove package"
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
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Input
                  id={`duration-${idx}`}
                  label="Duration (Hours)"
                  description="Must fit within one operating day"
                  type="number"
                  min={1}
                  max={24}
                  placeholder="8"
                  value={pkg.durationHours}
                  onNumberChange={(val) => updatePackage(idx, "durationHours", val)}
                  required
                />

                <Input
                  id={`original-${idx}`}
                  label="Original Price"
                  description="Price before discount"
                  type="number"
                  formatPrice
                  placeholder="10000"
                  value={pkg.originalPrice}
                  onNumberChange={(val) => updatePackage(idx, "originalPrice", val)}
                  required
                />

                <Input
                  id={`offered-${idx}`}
                  label="Offered Price"
                  description="Discounted price"
                  type="number"
                  formatPrice
                  placeholder="8000"
                  value={pkg.offeredPrice}
                  onNumberChange={(val) => updatePackage(idx, "offeredPrice", val)}
                  required
                />
              </div>
            </div>

            {equipmentItems.length > 0 && (
              <FormField label="Equipment included" description="Pick gear from your Equipment list. A paid item included here is covered by the package price.">
                <div className="flex flex-col gap-2">
                  {equipmentItems.filter((item) => item.name.trim()).map((item) => {
                    const refs = pkg.includedEquipment ?? [];
                    const ref = refs.find((r) => r.equipmentId === item.id);
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                        <Checkbox
                          id={`pkg-${idx}-eq-${item.id}`}
                          label={item.name}
                          checked={Boolean(ref)}
                          onCheckedChange={(checked) =>
                            setIncludedEquipment(
                              idx,
                              checked
                                ? [...refs, { equipmentId: item.id, quantity: Math.max(1, item.quantity || 1) }]
                                : refs.filter((r) => r.equipmentId !== item.id)
                            )
                          }
                        />
                        {ref && (
                          <div className="w-20">
                            <Input
                              id={`pkg-${idx}-eq-qty-${item.id}`}
                              type="number"
                              aria-label={`Quantity of ${item.name} in this package`}
                              value={ref.quantity}
                              onNumberChange={(qty) =>
                                setIncludedEquipment(
                                  idx,
                                  refs.map((r) => (r.equipmentId === item.id ? { ...r, quantity: Math.max(1, qty) } : r))
                                )
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </FormField>
            )}

            <FormField
              label={equipmentItems.length > 0 ? "Other inclusions" : "Features"}
              description={equipmentItems.length > 0 ? "Anything that isn't equipment, e.g. \"1 helper\". Press enter to add each one" : "Press enter to add each feature"}
            >
              <div className="flex flex-wrap items-center gap-2 min-h-19 p-3 rounded-xl bg-muted/30 border border-dashed border-border/60">
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
                    icon={IoClose}
                  />
                ))}
                <div className="min-w-45 flex-1">
                  <Input
                    id={`new-feature-${idx}`}
                    placeholder="Type and press Enter..."
                    className="h-8 border-none bg-transparent shadow-none focus-within:border-transparent [&_input]:px-2"
                    aria-label={`Add feature to package ${idx + 1}`}
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
              </div>
            </FormField>

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
          icon={IoAdd}
          fit
        />
      </div>
    </FormField>
  );
}
