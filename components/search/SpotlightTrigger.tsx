"use client";

import { useEffect, useState } from "react";
import { BiSearch } from "react-icons/bi";
import { IoSparkles } from "react-icons/io5";

import Button from "@/components/ui/Button";
import Kbd from "@/components/ui/Kbd";
import { useShortcutModifier } from "@/hooks/useShortcutModifier";
import useUIStore from "@/hooks/useUIStore";
import { SEARCH_CONFIG } from "@/lib/search/config";
import { cn } from "@/lib/utils";

const TONES = {
    light: {
        variant: "ghost",
        button: "h-11 max-w-md bg-background pl-4 pr-2 text-foreground/80 shadow-sm hover:border-foreground/25 hover:shadow-md",
        text: "text-sm",
        rotate: false,
    },
    glass: {
        variant: "secondary",
        button: "h-14 max-w-lg pl-5 pr-1.5 shadow-sm backdrop-blur-2xl md:h-16 md:max-w-xl md:pl-6 lg:max-w-2xl",
        text: "text-sm text-background/90 md:text-base",
        rotate: true,
    },
} as const;

function useRotatingHint(enabled: boolean) {
    const [index, setIndex] = useState(-1);

    useEffect(() => {
        if (!enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const timer = setInterval(() => setIndex((current) => (current + 1) % SEARCH_CONFIG.examples.length), SEARCH_CONFIG.hintIntervalMs);
        return () => clearInterval(timer);
    }, [enabled]);

    return index < 0 ? null : SEARCH_CONFIG.examples[index];
}

export default function SpotlightTrigger({ tone = "light" }: { tone?: keyof typeof TONES }) {
    const onOpen = useUIStore((state) => state.onOpen);
    const style = TONES[tone];
    const hint = useRotatingHint(style.rotate);
    const modifier = useShortcutModifier();

    return (
        <Button
            variant={style.variant}
            outline
            rounded
            aria-haspopup="dialog"
            aria-label={SEARCH_CONFIG.prompt}
            onClick={() => onOpen("spotlight")}
            className={cn("group min-w-0 justify-start gap-2.5 font-normal", style.button)}
        >
            <IoSparkles size={16} className="shrink-0 text-current" aria-hidden />
            <span className={cn("min-w-0 flex-1 truncate text-left", style.text)}>
                {hint ? (
                    <span key={hint} className="block truncate transition-opacity duration-500 starting:opacity-0">Try “{hint}”</span>
                ) : (
                    <>
                        <span className="sm:hidden">{SEARCH_CONFIG.promptShort}</span>
                        <span className="hidden sm:inline">{SEARCH_CONFIG.prompt}</span>
                    </>
                )}
            </span>
            {tone === "glass" ? (
                <span className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-background px-4 text-sm font-medium text-foreground transition-transform group-hover:scale-[1.03] md:h-13 md:px-5">
                    <BiSearch size={16} aria-hidden />
                    Search
                </span>
            ) : modifier && (
                <span className="hidden shrink-0 items-center gap-1 md:pointer-fine:flex">
                    <Kbd>{modifier}</Kbd>
                    <Kbd>K</Kbd>
                </span>
            )}
        </Button>
    );
}
