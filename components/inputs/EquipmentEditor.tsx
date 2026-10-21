"use client";

import { IoAdd, IoCopyOutline, IoTrashOutline } from "react-icons/io5";

import Input from "@/components/ui/Input";
import {
    EQUIPMENT_CATEGORIES,
    EQUIPMENT_CATEGORY_LABELS,
    type EquipmentCategory,
    type EquipmentItem,
    type EquipmentPolicy,
    type EquipmentPricing,
} from "@/lib/listing/equipment";
import { cn } from "@/lib/utils";

export type EquipmentEditorValue = {
    policy: EquipmentPolicy | null;
    items: EquipmentItem[];
};

const POLICY_OPTIONS: Array<{ value: EquipmentPolicy; label: string; hint: string }> = [
    { value: "all_bookings", label: "Every booking", hint: "Included gear comes with hourly bookings and packages" },
    { value: "packages_only", label: "Packages only", hint: "Included gear comes with packages; hourly bookings add gear" },
    { value: "none", label: "No equipment", hint: "Guests bring their own or add paid gear" },
];

const PRICING_OPTIONS: Array<{ value: EquipmentPricing; label: string }> = [
    { value: "included", label: "Included" },
    { value: "paid", label: "Paid" },
    { value: "on_request", label: "On request" },
];

/** Common gear an owner can tick to pre-fill rows. */
const STARTER_ITEMS: Array<{ name: string; category: EquipmentCategory }> = [
    { name: "LED light", category: "lighting" },
    { name: "Strobe / flash", category: "lighting" },
    { name: "Softbox", category: "modifiers" },
    { name: "Umbrella", category: "modifiers" },
    { name: "Reflector", category: "modifiers" },
    { name: "C-stand", category: "grip" },
    { name: "Light stand", category: "grip" },
    { name: "Paper backdrop", category: "backdrops" },
    { name: "Cyclorama wall", category: "backdrops" },
    { name: "Lavalier mic", category: "audio" },
    { name: "Podcast mic", category: "audio" },
    { name: "Tripod", category: "camera" },
];

const newItemId = () => {
    const random = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, "")
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    return `eq_${random.slice(0, 16).toLowerCase()}`;
};

const blankItem = (overrides: Partial<EquipmentItem> = {}): EquipmentItem => ({
    id: newItemId(),
    name: "",
    category: "lighting",
    quantity: 1,
    pricing: "included",
    price: null,
    priceUnit: null,
    availableQty: null,
    image: null,
    legacyAddonId: null,
    sortOrder: 0,
    ...overrides,
});

const fieldClass = "h-10 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20";

function Segmented<T extends string>({
    options,
    value,
    onChange,
    name,
}: {
    options: Array<{ value: T; label: string }>;
    value: T | null;
    onChange: (value: T) => void;
    name: string;
}) {
    return (
        <div role="radiogroup" aria-label={name} className="inline-flex flex-wrap gap-1 rounded-lg border border-border p-1">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={value === option.value}
                    onClick={() => onChange(option.value)}
                    className={cn(
                        "rounded-md px-3 py-1.5 text-xs font-medium transition",
                        value === option.value ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

export default function EquipmentEditor({
    value,
    onChange,
    error,
}: {
    value: EquipmentEditorValue;
    onChange: (value: EquipmentEditorValue) => void;
    error?: string;
}) {
    const { policy, items } = value;
    const setItems = (next: EquipmentItem[]) => onChange({ policy, items: next.map((item, index) => ({ ...item, sortOrder: index })) });
    const updateItem = (id: string, patch: Partial<EquipmentItem>) =>
        setItems(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));

    const starterChecked = (name: string) => items.some((item) => item.name.trim().toLowerCase() === name.toLowerCase());
    const toggleStarter = (starter: (typeof STARTER_ITEMS)[number]) => {
        if (starterChecked(starter.name)) {
            setItems(items.filter((item) => item.name.trim().toLowerCase() !== starter.name.toLowerCase()));
        } else {
            setItems([...items, blankItem({ name: starter.name, category: starter.category })]);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-foreground">When does included equipment come with a booking?</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {POLICY_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={policy === option.value}
                            onClick={() => onChange({ policy: option.value, items })}
                            className={cn(
                                "rounded-xl border p-3 text-left transition",
                                policy === option.value ? "border-foreground bg-foreground/5" : "border-border hover:bg-muted/50"
                            )}
                        >
                            <span className="block text-sm font-semibold text-foreground">{option.label}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">{option.hint}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-foreground">Quick add</p>
                <p className="text-xs text-muted-foreground">Tick what your studio has. You can edit names, quantities and pricing below.</p>
                <div className="flex flex-wrap gap-2">
                    {STARTER_ITEMS.map((starter) => {
                        const checked = starterChecked(starter.name);
                        return (
                            <button
                                key={starter.name}
                                type="button"
                                aria-pressed={checked}
                                onClick={() => toggleStarter(starter)}
                                className={cn(
                                    "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                                    checked ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:bg-muted"
                                )}
                            >
                                {checked ? "✓ " : "+ "}{starter.name}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold text-foreground">Equipment items</p>
                {items.length === 0 && (
                    <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                        No items yet. Use Quick add above or add a row.
                    </p>
                )}
                {items.map((item, index) => (
                    <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-border p-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_90px]">
                            <Input
                                id={`equipment-name-${item.id}`}
                                label="Name"
                                placeholder="e.g. Godox SL150 LED"
                                maxLength={100}
                                value={item.name}
                                onChange={(event) => updateItem(item.id, { name: event.target.value })}
                            />
                            <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                                Category
                                <select
                                    className={fieldClass}
                                    value={item.category}
                                    onChange={(event) => updateItem(item.id, { category: event.target.value })}
                                >
                                    {EQUIPMENT_CATEGORIES.map((category) => (
                                        <option key={category} value={category}>{EQUIPMENT_CATEGORY_LABELS[category]}</option>
                                    ))}
                                </select>
                            </label>
                            <Input
                                id={`equipment-qty-${item.id}`}
                                label="Qty"
                                type="number"
                                min={1}
                                value={item.quantity}
                                onNumberChange={(next) => updateItem(item.id, { quantity: Math.max(1, next) })}
                            />
                        </div>

                        <div className="flex flex-wrap items-end gap-3">
                            <Segmented
                                name={`Pricing for ${item.name || `item ${index + 1}`}`}
                                options={PRICING_OPTIONS}
                                value={item.pricing as EquipmentPricing}
                                onChange={(pricing) => updateItem(item.id, {
                                    pricing,
                                    ...(pricing === "paid" ? { priceUnit: item.priceUnit ?? "per_booking" } : { price: null, priceUnit: null, availableQty: null }),
                                })}
                            />
                            {item.pricing === "paid" && (
                                <>
                                    <div className="w-32">
                                        <Input
                                            id={`equipment-price-${item.id}`}
                                            label="Price (₹ per booking)"
                                            type="number"
                                            min={1}
                                            value={item.price ?? ""}
                                            onNumberChange={(next) => updateItem(item.id, { price: next > 0 ? next : null })}
                                        />
                                    </div>
                                    <div className="w-28">
                                        <Input
                                            id={`equipment-available-${item.id}`}
                                            label="Available"
                                            type="number"
                                            min={0}
                                            placeholder="No limit"
                                            value={item.availableQty ?? ""}
                                            onChange={(event) => updateItem(item.id, { availableQty: event.target.value === "" ? null : Math.max(0, Number(event.target.value)) })}
                                        />
                                    </div>
                                </>
                            )}
                            <div className="ml-auto flex gap-1">
                                <button
                                    type="button"
                                    onClick={() => setItems([...items.slice(0, index + 1), { ...item, id: newItemId(), legacyAddonId: null }, ...items.slice(index + 1)])}
                                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    <IoCopyOutline size={14} /> Duplicate
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setItems(items.filter((other) => other.id !== item.id))}
                                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                                >
                                    <IoTrashOutline size={14} /> Remove
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={() => setItems([...items, blankItem()])}
                    className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                    <IoAdd size={16} /> Add item
                </button>
                {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
        </div>
    );
}
