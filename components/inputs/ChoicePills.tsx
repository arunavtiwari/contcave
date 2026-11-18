"use client";

import ToggleChip from "@/components/ui/ToggleChip";

type ChoicePillsProps<T extends string> = {
    label: string;
    options: readonly { value: T; label: string }[];
    value: T | null;
    onChange: (value: T) => void;
};

export default function ChoicePills<T extends string>({ label, options, value, onChange }: ChoicePillsProps<T>) {
    return (
        <div role="group" aria-label={label} className="flex flex-wrap gap-2">
            {options.map((option) => (
                <ToggleChip key={option.value} selected={option.value === value} onClick={() => onChange(option.value)}>
                    {option.label}
                </ToggleChip>
            ))}
        </div>
    );
}
