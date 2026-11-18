"use client";

import { IoMdClose } from "react-icons/io";

import Button from "@/components/ui/Button";
import Dialog, { DialogTitle } from "@/components/ui/Dialog";

interface VideoTourModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoSrc: string;
    title: string;
}

export default function VideoTourModal({ isOpen, onClose, videoSrc, title }: VideoTourModalProps) {
    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => !open && onClose()}
            overlayClassName="backdrop-blur-sm"
            className="aspect-video w-[calc(100%-2rem)] max-w-5xl overflow-hidden rounded-2xl bg-black"
        >
            <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-center justify-between bg-linear-to-b from-black/60 to-transparent px-6 py-4">
                <DialogTitle className="text-lg font-semibold text-white">Video tour: {title}</DialogTitle>
                <Button isIconOnly icon={IoMdClose} onClick={onClose} aria-label="Close video" className="pointer-events-auto" />
            </div>
            <video src={videoSrc} controls autoPlay className="size-full object-contain" poster="/video-placeholder.jpg">
                Your browser does not support the video tag.
            </video>
        </Dialog>
    );
}
