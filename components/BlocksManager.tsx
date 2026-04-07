"use client";

import axios from "axios";
import { format } from "date-fns";
import CalendarIcon from "lucide-react/dist/esm/icons/calendar";
import Clock from "lucide-react/dist/esm/icons/clock";
import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import { useCallback, useEffect, useState } from "react";
import Select, { Theme } from "react-select";
import { toast } from "react-toastify";

import { ListingBlock, ListingSet } from "@/types/set";

interface BlocksManagerProps {
    listingId: string;
    sets: ListingSet[];
}

const selectTheme = (theme: Theme): Theme => ({
    ...theme,
    borderRadius: 10,
    colors: { ...theme.colors, primary: "black", primary25: "#F3F4F6", primary50: "#E5E7EB" },
});

import { TIME_SLOTS } from "@/constants/timeSlots";

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
            const res = await axios.get(`/api/listings/${listingId}/blocks`);
            setBlocks(res.data.data || []);
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
            await axios.post(`/api/listings/${listingId}/blocks`, newBlock);
            toast.success("Block created successfully");
            setNewBlock({
                date: format(new Date(), "yyyy-MM-dd"),
                startTime: "9:00 AM",
                endTime: "6:00 PM",
                setIds: [],
                reason: "",
            });
            fetchBlocks();
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { error?: string } } };
            toast.error(axiosError?.response?.data?.error || "Failed to create block");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteBlock = async (blockId: string) => {
        try {
            await axios.delete(`/api/listings/${listingId}/blocks?blockId=${blockId}`);
            toast.success("Block removed");
            fetchBlocks();
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
            <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Plus size={20} />
                    Create New Block
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <CalendarIcon size={14} />
                            Date
                        </label>
                        <input
                            type="date"
                            value={newBlock.date}
                            onChange={(e) => setNewBlock({ ...newBlock, date: e.target.value })}
                            className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Clock size={14} />
                                Start
                            </label>
                            <select
                                value={newBlock.startTime}
                                onChange={(e) => setNewBlock({ ...newBlock, startTime: e.target.value })}
                                className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10"
                            >
                                {TIME_SLOTS.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Clock size={14} />
                                End
                            </label>
                            <select
                                value={newBlock.endTime}
                                onChange={(e) => setNewBlock({ ...newBlock, endTime: e.target.value })}
                                className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10"
                            >
                                {TIME_SLOTS.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
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
                                    setIds: selected ? selected.map((opt) => opt.value) : [],
                                })
                            }
                            placeholder="Block entire listing if none selected"
                            theme={selectTheme}
                            className="text-sm"
                        />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                        <label className="text-sm font-medium">Reason (Optional)</label>
                        <input
                            type="text"
                            value={newBlock.reason}
                            onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
                            placeholder="e.g., Maintenance, Personal Use"
                            className="w-full border border-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10"
                        />
                    </div>
                </div>
                <button
                    onClick={handleCreateBlock}
                    disabled={isCreating}
                    className="mt-6 w-full bg-black text-white py-3 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50"
                >
                    {isCreating ? "Creating..." : "Create Block"}
                </button>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Existing Blocks</h3>
                {isLoading ? (
                    <div className="text-center py-8 text-neutral-500">Loading blocks...</div>
                ) : blocks.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500 border-2 border-dashed rounded-2xl">
                        No active blocks found
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {blocks.map((block) => (
                            <div
                                key={block.id}
                                className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl bg-white hover:shadow-sm transition"
                            >
                                <div className="flex flex-col gap-1">
                                    <div className="font-medium flex items-center gap-2">
                                        <CalendarIcon size={16} className="text-neutral-400" />
                                        {format(new Date(block.date), "PPP")}
                                    </div>
                                    <div className="text-sm text-neutral-500 flex items-center gap-2">
                                        <Clock size={14} />
                                        {block.startTime} - {block.endTime}
                                    </div>
                                    {block.setIds && block.setIds.length > 0 && (
                                        <div className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full w-fit mt-1">
                                            {block.setIds.length} set(s) blocked
                                        </div>
                                    )}
                                    {block.reason && (
                                        <div className="text-sm text-neutral-600 italic mt-1">
                                            "{block.reason}"
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDeleteBlock(block.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
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
