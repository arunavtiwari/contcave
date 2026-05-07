"use client";

import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import { IoMdClose } from "react-icons/io";

import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";

interface VideoTourModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoSrc: string;
    title: string;
}

const VideoTourModal: React.FC<VideoTourModalProps> = ({
    isOpen,
    onClose,
    videoSrc,
    title,
}) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 md:p-8">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-foreground/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                        className="relative w-full max-w-5xl aspect-video bg-background rounded-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="absolute top-0 left-0 right-0 px-6 py-4 flex justify-between items-center z-50 bg-linear-to-b from-black/60 to-transparent pointer-events-none">
                            <Heading 
                                title={`Video Tour: ${title}`}
                                variant="h5"
                                className="text-white m-0"
                            />
                            <Button
                                isIconOnly
                                icon={IoMdClose}
                                onClick={onClose}
                                className="pointer-events-auto"
                            />
                        </div>

                        {/* Video Player */}
                        <div className="w-full h-full bg-black flex items-center justify-center">
                            <video
                                src={videoSrc}
                                controls
                                autoPlay
                                className="w-full h-full object-contain"
                                poster="/video-placeholder.jpg"
                            >
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default VideoTourModal;
