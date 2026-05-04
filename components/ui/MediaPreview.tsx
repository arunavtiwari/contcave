"use client";

import Image from "next/image";
import React from "react";
import { IoMdClose } from "react-icons/io";

interface MediaPreviewProps {
    /** Source URL of the image or video */
    src: string;
    /** Alt text for images */
    alt?: string;
    /** Whether this is a video preview */
    isVideo?: boolean;
    /** Called when the remove button is clicked */
    onRemove?: () => void;
    /** Width in pixels (default: 128) */
    width?: number;
    /** Height in pixels (default: 128) */
    height?: number;
    /** Additional classNames for the container */
    className?: string;
}

/**
 * Reusable media preview with an overlay remove button.
 * Replaces the repeated pattern of image/video + X button overlay
 * found across PropertyClient, RentModal, and upload components.
 */
export default function MediaPreview({
    src,
    alt = "Preview",
    isVideo = false,
    onRemove,
    width = 128,
    height = 128,
    className = "",
}: MediaPreviewProps) {
    return (
        <div className={`relative group ${className}`}>
            {isVideo ? (
                <video
                    src={src}
                    controls
                    className="w-full h-full rounded-xl object-cover border border-border"
                    style={{ maxWidth: width, maxHeight: height }}
                />
            ) : (
                <Image
                    src={src}
                    alt={alt}
                    width={width}
                    height={height}
                    className="rounded-xl object-cover border border-border"
                    style={{ width, height }}
                    unoptimized={src.startsWith("blob:") || src.startsWith("data:")}
                />
            )}

            {onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="absolute top-2 right-2 bg-foreground/60 hover:bg-foreground/80 text-background rounded-full w-6 h-6 opacity-0 group-hover:opacity-100 transition cursor-pointer flex items-center justify-center z-10"
                    aria-label={`Remove ${isVideo ? "video" : "image"}`}
                >
                    <IoMdClose size={18} />
                </button>
            )}
        </div>
    );
}
