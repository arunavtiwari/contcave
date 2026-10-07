"use client";

import { IoLocationOutline } from "react-icons/io5";

import ChoicePills from "@/components/inputs/ChoicePills";
import Callout from "@/components/ui/Callout";

type CityQuestionProps = { cityOptions: string[]; suggestedCity: string | null; onSelect: (city: string) => void };

export default function CityQuestion({ cityOptions, suggestedCity, onSelect }: CityQuestionProps) {
    const ordered = suggestedCity ? [suggestedCity, ...cityOptions.filter((city) => city !== suggestedCity)] : cityOptions;

    return (
        <Callout title="Which city is the shoot in?" icon={IoLocationOutline}>
            <div className="mt-2">
                <ChoicePills label="City" options={ordered.map((city) => ({ value: city, label: city }))} value={suggestedCity} onChange={onSelect} />
            </div>
        </Callout>
    );
}
