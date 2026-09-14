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

    return (
        <FormField label={label} description={description} variant={variant} align="start">
            <div className="w-full flex flex-wrap gap-2">
                {vocab.map((item) => (
                    <Pill
                        key={item.slug}
                        label={item.label}
                        onClick={() => toggle(item.label)}
                        variant={value.includes(item.label) ? "solid" : "secondary"}
                    />
                ))}
            </div>
        </FormField>
    );
};

export default TaxonomyPillSelect;
