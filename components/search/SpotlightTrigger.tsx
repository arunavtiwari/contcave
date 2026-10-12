"use client";

import { useEffect, useState } from "react";
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
        button: "h-11 max-w-md bg-background pl-4 pr-2 text-foreground/80 hover:bg-neutral-50/70 hover:border-foreground/25 transition-all duration-200",
        text: "text-sm",
        rotate: false,
        shortcut: true,
    },
    glass: {
        variant: "secondary",
        button: "h-12 max-w-md px-5 shadow-sm backdrop-blur-2xl md:h-13 md:max-w-lg",
        text: "text-sm text-background/90",
        rotate: true,
        shortcut: false,
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
            className={cn("min-w-0 justify-start gap-2.5 font-normal", style.button)}
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
            {style.shortcut && modifier && (
                <span className="hidden shrink-0 items-center gap-1 md:pointer-fine:flex">
                    <Kbd>{modifier}</Kbd>
                    <Kbd>K</Kbd>
                </span>
            )}
        </Button>
    );
}
