"use client";

import Pill from "@/components/ui/Pill";

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
                <button key={option.value} type="button" aria-pressed={option.value === value} className="rounded-full" onClick={() => onChange(option.value)}>
                    <Pill size="sm" variant={option.value === value ? "solid" : "secondary"} label={option.label} />
                </button>
            ))}
        </div>
    );
}
