"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { FiBox, FiCamera, FiChevronDown, FiImage, FiMic, FiPackage, FiSun, FiTool, FiUmbrella, FiUsers } from "react-icons/fi";

import Pill from "@/components/ui/Pill";
import {
    addonIdFor,
    EQUIPMENT_CATEGORY_LABELS,
    EQUIPMENT_POLICY_COPY,
    EQUIPMENT_REVEAL_EVENT,
    equipmentAnchorId,
    type EquipmentCategory,
    equipmentCountSummary,
    type EquipmentItem,
    type EquipmentPolicy,
    groupEquipment,
} from "@/lib/listing/equipment";
import { cn, formatINR } from "@/lib/utils";
import { buildWhatsAppUrl, equipmentRequestMessage } from "@/lib/whatsapp/urls";
import type { Addon } from "@/types/addon";

const CATEGORY_ICONS: Record<EquipmentCategory, IconType> = {
    lighting: FiSun,
    modifiers: FiUmbrella,
    backdrops: FiImage,
    grip: FiTool,
    audio: FiMic,
    camera: FiCamera,
    props: FiBox,
    crew: FiUsers,
    other: FiPackage,
};

const DESKTOP_VISIBLE = 6;
const MOBILE_VISIBLE = 4;

type Props = {
    policy: EquipmentPolicy | null;
    items: EquipmentItem[];
    studioName: string;
    /** Curated listings show "Listed as included" until the owner confirms. */
    includedLabel: string;
    /** Indicative-info note for curated listings. */
    note?: string | null;
    /** Selected paid items, in the add-on shape the booking flow expects. */
    onAddonsChange: (selected: Addon[]) => void;
    disabled?: boolean;
};

export default function EquipmentSection({ policy, items, studioName, includedLabel, note, onAddonsChange, disabled }: Props) {
    const [open, setOpen] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const groups = useMemo(() => groupEquipment(items), [items]);
    const lastSignature = useRef("");

    useEffect(() => {
        const selected: Addon[] = items
            .filter((item) => item.pricing === "paid" && (quantities[item.id] ?? 0) > 0)
            .map((item) => ({
                id: addonIdFor(item),
                name: item.name,
                price: item.price ?? 0,
                imageUrl: item.image ?? "",
                qty: quantities[item.id],
            }));
        const signature = selected.map((addon) => `${addon.id}:${addon.qty}`).join(",");
        if (signature !== lastSignature.current) {
            lastSignature.current = signature;
            onAddonsChange(selected);
        }
    }, [items, quantities, onAddonsChange]);

    const setQty = useCallback((item: EquipmentItem, next: number) => {
        const cap = item.availableQty ?? Number.POSITIVE_INFINITY;
        setQuantities((prev) => ({ ...prev, [item.id]: Math.max(0, Math.min(next, cap)) }));
    }, []);

    // Package chips ask to reveal an item; open the section (and the full list) before scrolling.
    useEffect(() => {
        const reveal = (event: Event) => {
            const id = (event as CustomEvent<string>).detail;
            if (!items.some((item) => item.id === id)) return;
            setOpen(true);
            setExpanded(true);
            requestAnimationFrame(() => {
                document.getElementById(equipmentAnchorId(id))?.scrollIntoView({ behavior: "smooth", block: "center" });
            });
        };
        window.addEventListener(EQUIPMENT_REVEAL_EVENT, reveal);
        return () => window.removeEventListener(EQUIPMENT_REVEAL_EVENT, reveal);
    }, [items]);

    const summary = equipmentCountSummary(items);
    let rowIndex = 0;

    return (
        <section className="flex flex-col gap-4" aria-labelledby="equipment-heading">
            <div className="flex flex-col gap-1">
                <h2 id="equipment-heading">
                    <button
                        type="button"
                        onClick={() => setOpen((value) => !value)}
                        aria-expanded={open}
                        aria-controls="equipment-list"
                        className="flex w-full items-center justify-between gap-4 text-left"
                    >
                        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span className="text-lg font-bold leading-[1.4] text-foreground">Equipment</span>
                            {summary && <span className="text-sm font-normal text-muted-foreground">{summary}</span>}
                        </span>
                        <FiChevronDown
                            size={20}
                            aria-hidden="true"
                            className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
                        />
                    </button>
                </h2>
                {policy && <p className="text-sm text-muted-foreground">{EQUIPMENT_POLICY_COPY[policy]}</p>}
                {note && <p className="text-xs text-muted-foreground/80">{note}</p>}
            </div>

            <div id="equipment-list" hidden={!open} className="flex flex-col gap-4">

            {groups.map((group) => {
                const Icon = CATEGORY_ICONS[group.category];
                return (
                    <div key={group.category} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Icon size={16} aria-hidden="true" />
                            {EQUIPMENT_CATEGORY_LABELS[group.category]}
                        </div>
                        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
                            {group.items.map((item) => {
                                const index = rowIndex++;
                                const hiddenWhenCollapsed = !expanded && (
                                    index >= DESKTOP_VISIBLE ? "hidden" : index >= MOBILE_VISIBLE ? "max-sm:hidden" : ""
                                );
                                return (
                                    <li
                                        key={item.id}
                                        id={equipmentAnchorId(item.id)}
                                        className={cn("flex scroll-mt-28 items-center justify-between gap-3 px-3 py-2.5", hiddenWhenCollapsed)}
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-foreground" title={item.name}>{item.name}</p>
                                            {item.quantity > 1 && <p className="text-xs text-muted-foreground">× {item.quantity}</p>}
                                        </div>
                                        <EquipmentStatus
                                            item={item}
                                            includedLabel={includedLabel}
                                            studioName={studioName}
                                            qty={quantities[item.id] ?? 0}
                                            onQtyChange={(next) => setQty(item, next)}
                                            disabled={disabled}
                                        />
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                );
            })}

            {items.length > MOBILE_VISIBLE && (
                <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    className={cn(
                        "w-fit text-sm font-medium underline underline-offset-4",
                        items.length <= DESKTOP_VISIBLE && "sm:hidden"
                    )}
                >
                    {expanded ? "Show fewer items" : `Show all ${items.length} items`}
                </button>
            )}
            </div>
        </section>
    );
}

function EquipmentStatus({
    item,
    includedLabel,
    studioName,
    qty,
    onQtyChange,
    disabled,
}: {
    item: EquipmentItem;
    includedLabel: string;
    studioName: string;
    qty: number;
    onQtyChange: (next: number) => void;
    disabled?: boolean;
}) {
    if (item.pricing === "included") {
        return <Pill label={includedLabel} variant="success" size="xs" className="shrink-0" />;
    }

    if (item.pricing === "on_request") {
        return (
            <a
                href={buildWhatsAppUrl(equipmentRequestMessage(studioName, item.name))}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={disabled}
                className={cn("shrink-0", disabled && "pointer-events-none opacity-50")}
            >
                <Pill label="On request" variant="card-muted" size="xs" clickable />
            </a>
        );
    }

    const cap = item.availableQty ?? Number.POSITIVE_INFINITY;
    const priceLabel = `${formatINR(item.price ?? 0)}${item.priceUnit === "per_hour" ? " / hr" : ""}`;
    // Per-hour pricing isn't bookable yet; show the price without an Add button.
    const bookable = item.priceUnit !== "per_hour";

    return (
        <div className="flex shrink-0 items-center gap-2">
            <Pill label={priceLabel} variant="warning" size="xs" />
            {bookable && (cap === 0 ? (
                <span className="text-xs text-muted-foreground">Unavailable</span>
            ) : qty === 0 ? (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onQtyChange(1)}
                    className="h-7 rounded-full bg-foreground px-3 text-xs font-semibold text-background disabled:opacity-50"
                >
                    Add
                </button>
            ) : (
                <div className="flex h-7 items-center overflow-hidden rounded-full border border-border text-sm">
                    <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => onQtyChange(qty - 1)} className="h-full w-7 bg-muted hover:bg-muted/80">−</button>
                    <span className="w-7 text-center">{qty}</span>
                    <button
                        type="button"
                        aria-label={`Add one more ${item.name}`}
                        disabled={qty >= cap}
                        onClick={() => onQtyChange(qty + 1)}
                        className="h-full w-7 bg-muted hover:bg-muted/80 disabled:text-muted-foreground/50"
                    >
                        +
                    </button>
                </div>
            ))}
        </div>
    );
}
