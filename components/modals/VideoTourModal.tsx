"use client";

import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import { IoMdClose } from "react-icons/io";

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
                        className="absolute inset-0 bg-foreground/90 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                        className="relative w-full max-w-5xl aspect-video bg-background rounded-3xl overflow-hidden shadow-2xl border border-white/10"
                    >
                        {/* Header */}
                        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50 bg-linear-to-b from-black/60 to-transparent pointer-events-none">
                            <h3 className="text-white text-xl md:text-2xl font-bold tracking-tight">
                                Video Tour: {title}
                            </h3>
                            <button
                                onClick={onClose}
                                className="pointer-events-auto p-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-full text-white transition-all hover:scale-110 active:scale-95"
                            >
                                <IoMdClose size={24} />
                            </button>
                        </div>

                        {/* Video Player */}
                        <div className="w-full h-full bg-black flex items-center justify-center">
                            <video
                                src={videoSrc}
                                controls
                                autoPlay
                                className="w-full h-full object-contain"
                                poster="/video-placeholder.jpg" // You can add a poster if needed
                            >
                                Your browser does not support the video tag.
                            </video>
                        </div>

                        {/* Footer Overlay - Premium Touch */}
                        <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center z-50 bg-linear-to-t from-black/40 to-transparent pointer-events-none">
                            <span className="text-white/60 text-sm font-medium tracking-widest uppercase">
                                ContCave Exclusive Tour
                            </span>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default VideoTourModal;
