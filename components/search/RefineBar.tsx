"use client";

import { type FormEvent, useId, useState, useTransition } from "react";
import { IoSparkles } from "react-icons/io5";

import { refineSearchAction } from "@/app/actions/searchActions";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { SEARCH_CONFIG } from "@/lib/search/config";
import type { ParsedQuery } from "@/schemas/search";

const NO_CHANGE_MESSAGE = "Nothing to change. Try “cheaper”, “closer to Hazratganj” or “only with a makeup room”.";

type RefineBarProps = { parsed: ParsedQuery; onRefine: (params: Record<string, string>) => void };

export default function RefineBar({ parsed, onRefine }: RefineBarProps) {
    const inputId = useId();
    const [text, setText] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const followUp = text.trim();
        if (!followUp) return;
        startTransition(async () => {
            const result = await refineSearchAction({ parsed, text: followUp });
            if (!result.success || !result.data) {
                setMessage(result.error ?? "Could not refine the search. Please try again.");
                return;
            }
            if (!Object.keys(result.data).length) {
                setMessage(NO_CHANGE_MESSAGE);
                return;
            }
            setMessage(null);
            setText("");
            onRefine(result.data);
        });
    };

    return (
        <form onSubmit={submit} className="w-full space-y-1.5">
            <Input
                id={inputId}
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={SEARCH_CONFIG.maxQueryLength}
                autoComplete="off"
                placeholder="Refine: cheaper, closer to Hazratganj, with a makeup room…"
                aria-label="Refine your search"
                customLeftContent={<IoSparkles size={14} className="text-foreground" aria-hidden />}
                customRightContent={(
                    <Button type="submit" label="Refine" variant="ghost" fit loading={isPending} disabled={!text.trim()} className="h-auto px-0 text-xs" />
                )}
            />
            {message && <p className="text-xs text-muted-foreground" role="status">{message}</p>}
        </form>
    );
}
