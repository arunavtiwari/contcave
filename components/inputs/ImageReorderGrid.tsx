"use client";

import {
    closestCenter,
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    arrayMove,
    rectSortingStrategy,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import React, { useId, useMemo, useState } from "react";
import { IoMdClose } from "react-icons/io";

const isVideo = (url: string) => {
    return /\.(mp4|webm|mov)$/i.test(url);
};

interface SortablePhotoItemProps {
    id: string;
    url: string;
    index: number;
    onRemove?: (index: number) => void;
}

function SortablePhotoItem({ id, url, index, onRemove }: SortablePhotoItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="relative h-32 w-32 rounded-xl overflow-hidden border cursor-grab active:cursor-grabbing group touch-none"
        >
            {isVideo(url) ? (
                <video
                    src={url}
                    className="h-full w-full object-cover pointer-events-none"
                    muted
                    playsInline
                />
            ) : (
                <Image
                    src={url}
                    alt={`Media ${index}`}
                    fill
                    className="object-cover pointer-events-none"
                    unoptimized={url.startsWith("blob:")}
                />
            )}

            {onRemove && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onRemove(index);
                    }}
                    onPointerDown={(e) => {
                        // Prevent dnd-kit from starting drag when clicking remove
                        e.stopPropagation();
                    }}
                    className="absolute top-2 right-2 bg-foreground/60 hover:bg-foreground/80 text-background rounded-full w-6 h-6 opacity-0 group-hover:opacity-100 transition cursor-pointer flex items-center justify-center z-20"
                    aria-label="Remove media"
                >
                    <IoMdClose size={18} />
                </button>
            )}
        </div>
    );
}

// Separate Photo for DragOverlay so it doesn't try to register as a sortable node
function DraggingPhotoOverlay({ url }: { url: string }) {
    return (
        <div className="relative h-32 w-32 rounded-xl overflow-hidden border  opacity-80 cursor-grabbing bg-background">
            {isVideo(url) ? (
                <video
                    src={url}
                    className="h-full w-full object-cover pointer-events-none"
                    muted
                    playsInline
                />
            ) : (
                <Image
                    src={url}
                    alt="Dragging Media"
                    fill
                    className="object-cover pointer-events-none"
                    unoptimized={url.startsWith("blob:")}
                />
            )}
        </div>
    );
}

interface ImageReorderGridProps {
    images: string[];
    onReorder: (newImages: string[]) => void;
    onRemove?: (index: number) => void;
}

export default function ImageReorderGrid({ images, onReorder, onRemove }: ImageReorderGridProps) {
    const [activeId, setActiveId] = useState<string | null>(null);

    // Items array mapping string URLs to IDs (since some URLs might be duplicated conceptually, 
    // though realistically they shouldn't in an upload queue, we use the URL as ID for sortable).
    const items = useMemo(() => images, [images]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Requires minimum drag distance of 5px to activate, enabling clicks inside elements
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const dndId = useId();

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = items.indexOf(active.id as string);
            const newIndex = items.indexOf(over.id as string);
            const newArray = arrayMove(items, oldIndex, newIndex);
            onReorder(newArray);
        }
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    return (
        <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <SortableContext items={items} strategy={rectSortingStrategy}>
                <div className="flex gap-4 w-full flex-wrap justify-center sm:justify-start">
                    {items.map((url, index) => (
                        <SortablePhotoItem
                            key={url}
                            id={url}
                            url={url}
                            index={index}
                            onRemove={onRemove}
                        />
                    ))}
                </div>
            </SortableContext>

            {/* Overlay rendered cleanly over the whole app when active */}
            <DragOverlay adjustScale={true} zIndex={1000}>
                {activeId ? <DraggingPhotoOverlay url={activeId} /> : null}
            </DragOverlay>
        </DndContext>
    );
}
