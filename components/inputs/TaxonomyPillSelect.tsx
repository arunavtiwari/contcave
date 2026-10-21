"use client";

import React from "react";

import FormField from "@/components/ui/FormField";
import Pill from "@/components/ui/Pill";
import { TaxonomyItem } from "@/lib/taxonomy";

interface TaxonomyPillSelectProps {
    label: string;
    description?: string;
    variant?: "vertical" | "horizontal";
    vocab: TaxonomyItem[];
    value: string[];
    onChange: (next: string[]) => void;
    max?: number;
    disabled?: boolean;
}

const TaxonomyPillSelect: React.FC<TaxonomyPillSelectProps> = ({
    label,
    description,
    variant,
    vocab,
    value,
    onChange,
    max,
    disabled,
}) => {
    const toggle = (itemLabel: string) => {
        if (disabled) return;
        const selected = value.includes(itemLabel);
        if (selected) {
            onChange(value.filter((v) => v !== itemLabel));
        } else {
            if (max && value.length >= max) return;
            onChange([...value, itemLabel]);
        }
    };

    const renderPills = (items: TaxonomyItem[]) => (
        <div className="w-full flex flex-wrap gap-2">
            {items.map((item) => (
                <Pill
                    key={item.slug}
                    label={item.label}
                    onClick={() => toggle(item.label)}
                    variant={value.includes(item.label) ? "solid" : "secondary"}
                />
            ))}
        </div>
    );

    const groups = Array.from(new Set(vocab.map((item) => item.group).filter((group): group is string => !!group)));

    return (
        <FormField label={label} description={description} variant={variant} align="start">
            {groups.length === 0 ? renderPills(vocab) : (
                <div className="flex w-full flex-col gap-4">
                    {groups.map((group) => (
                        <div key={group} className="flex flex-col gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
                            {renderPills(vocab.filter((item) => item.group === group))}
                        </div>
                    ))}
                    {vocab.some((item) => !item.group) && renderPills(vocab.filter((item) => !item.group))}
                </div>
            )}
        </FormField>
    );
};

export default TaxonomyPillSelect;
