"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { createBlockAction, deleteBlockAction, getBlocksAction } from "@/app/actions/listingActions";
import Input from "@/components/inputs/Input";
import Button from "@/components/ui/Button";
import Select, { SelectOption } from "@/components/ui/Select";
export interface ListingBlock {
    id: string;
    listingId: string;
    date: string | Date;
    startTime: string;
    endTime: string;
    setIds?: string[];
    reason?: string | null;
    createdAt?: Date;
}

import { TIME_SLOTS } from "@/constants/timeSlots";
import { ListingSet } from "@/types/set";

interface BlocksManagerProps {
    listingId: string;
    sets: ListingSet[];
}

const timeOptionsPrepared: SelectOption[] = TIME_SLOTS.map((t) => ({ value: t, label: t }));

export default function BlocksManager({ listingId, sets }: BlocksManagerProps) {
    const [blocks, setBlocks] = useState<ListingBlock[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);


    const [newBlock, setNewBlock] = useState({
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: "9:00 AM",
        endTime: "6:00 PM",
        setIds: [] as string[],
        reason: "",
    });

    const fetchBlocks = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await getBlocksAction(listingId);
            const formattedBlocks = (data || []).map(b => ({
                ...b,
                date: b.date instanceof Date ? b.date.toISOString() : b.date,
                reason: b.reason || ""
            }));
            setBlocks(formattedBlocks as unknown as ListingBlock[]);
        } catch (_error) {
            toast.error("Failed to load blocks");
        } finally {
            setIsLoading(false);
        }
    }, [listingId]);

    useEffect(() => {
        fetchBlocks();
    }, [fetchBlocks]);

    const handleCreateBlock = async () => {
        try {
            setIsCreating(true);
            const res = await createBlockAction(listingId, newBlock);
            if (res.success) {
                toast.success("Block created successfully");
                setNewBlock({
                    date: format(new Date(), "yyyy-MM-dd"),
                    startTime: "9:00 AM",
                    endTime: "6:00 PM",
                    setIds: [],
                    reason: "",
                });
                fetchBlocks();
            } else {
                toast.error(res.error || "Failed to create block");
            }
        } catch (_error: unknown) {
            toast.error("Failed to create block");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteBlock = async (blockId: string) => {
        try {
            const res = await deleteBlockAction(listingId, blockId);
            if (res.success) {
                toast.success("Block removed");
                fetchBlocks();
            } else {
                toast.error(res.error || "Failed to remove block");
            }
        } catch (_error) {
            toast.error("Failed to remove block");
        }
    };


    const setOptions = sets.map((s) => ({
        value: s.id,
        label: s.name,
    }));

    if (!mounted) return null;

    return (
        <div className="space-y-8">
            <div className="bg-muted/30 p-6 rounded-2xl border border-border">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Plus size={20} />
                    Create New Block
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Input
                            id="blockDate"
                            label="Date"
                            type="date"
                            value={newBlock.date}
                            onChange={(e) => setNewBlock({ ...newBlock, date: e.target.value })}
                            size="sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Clock size={14} />
                                Start
                            </label>
                            <Select
                                value={timeOptionsPrepared.find(t => t.value === newBlock.startTime) || null}
                                onChange={(sel) => setNewBlock({ ...newBlock, startTime: sel?.value || "" })}
                                options={timeOptionsPrepared}
                                size="sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Clock size={14} />
                                End
                            </label>
                            <Select
                                value={timeOptionsPrepared.find(t => t.value === newBlock.endTime) || null}
                                onChange={(sel) => setNewBlock({ ...newBlock, endTime: sel?.value || "" })}
                                options={timeOptionsPrepared}
                                size="sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                        <label className="text-sm font-medium">Affected Sets (Optional)</label>
                        <Select
                            isMulti
                            options={setOptions}
                            value={setOptions.filter((opt) => newBlock.setIds.includes(opt.value))}
                            onChange={(selected) =>
                                setNewBlock({
                                    ...newBlock,
                                    setIds: selected ? (selected as SelectOption[]).map((opt) => opt.value) : [],
                                })
                            }
                            placeholder="Block entire listing if none selected"
                            size="sm"
                        />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                        <Input
                            id="blockReason"
                            label="Reason (Optional)"
                            type="text"
                            value={newBlock.reason}
                            onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
                            placeholder="e.g., Maintenance, Personal Use"
                            size="sm"
                        />
                    </div>
                </div>
                <Button
                    label={isCreating ? "Creating..." : "Create Block"}
                    onClick={handleCreateBlock}
                    disabled={isCreating}
                    loading={isCreating}
                    rounded
                    classNames="mt-6 w-full font-bold text-base py-4"
                />
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Existing Blocks</h3>
                {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading blocks...</div>
                ) : blocks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-2xl">
                        No active blocks found
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {blocks.map((block) => (
                            <div
                                key={block.id}
                                className="flex items-center justify-between p-4 border border-border rounded-xl bg-background hover: transition"
                            >
                                <div className="flex flex-col gap-1">
                                    <div className="font-medium flex items-center gap-2">
                                        <CalendarIcon size={16} className="text-muted-foreground" />
                                        {format(new Date(block.date), "PPP")}
                                    </div>
                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Clock size={14} />
                                        {block.startTime} - {block.endTime}
                                    </div>
                                    {block.setIds && block.setIds.length > 0 && (
                                        <div className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full w-fit mt-1">
                                            {block.setIds.length} set(s) blocked
                                        </div>
                                    )}
                                    {block.reason && (
                                        <div className="text-sm text-muted-foreground italic mt-1">
                                            "{block.reason}"
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDeleteBlock(block.id)}
                                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition"
                                    aria-label="Delete block"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

