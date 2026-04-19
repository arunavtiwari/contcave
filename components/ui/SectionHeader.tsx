"use client";
import { motion } from "framer-motion";
import React from "react";

import Heading from "./Heading";

interface SectionHeaderProps {
    badge: string;
    title: React.ReactNode;
    description?: string;
    center?: boolean;
    className?: string;
    badgeClassName?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
    badge,
    title,
    description,
    center = false,
    className = "",
    badgeClassName = "",
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            viewport={{ once: true }}
            className={`mb-8 ${center ? "text-center" : "text-start"} ${className}`}
        >
            <p
                className={`mb-3 text-[10px] font-bold uppercase tracking-widest text-foreground/80 ${center ? "mx-auto" : ""
                    } ${badgeClassName}`}
            >
                {badge}
            </p>

            <Heading
                title={title}
                variant="h2"
                center={center}
            />

            {description && (
                <p className={`mt-4 text-muted-foreground leading-relaxed ${center ? "mx-auto md:w-4/5 lg:w-3/5" : "max-w-2xl"}`}>
                    {description}
                </p>
            )}
        </motion.div>
    );
};

export default SectionHeader;
