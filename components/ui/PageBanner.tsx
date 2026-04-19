"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import React from "react";

import Container from "@/components/Container";
import Heading from "@/components/ui/Heading";

interface PageBannerProps {
    title: string;
    subtitle?: string;
    image?: string;
}

const PageBanner: React.FC<PageBannerProps> = ({
    title,
    subtitle,
    image = "/assets/banner.jpg",
}) => {
    return (
        <section className="relative h-[35vh] min-h-75 w-full flex items-center justify-center overflow-hidden">
            <motion.div
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="absolute inset-0"
            >
                <Image
                    src={image}
                    alt={title}
                    fill
                    className="object-cover opacity-60"
                    priority
                />
                <div className="absolute inset-0 bg-linear-to-b from-foreground/40 via-foreground/60 to-foreground" />
            </motion.div>

            <Container>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="relative z-10"
                >
                    <Heading
                        title={title}
                        subtitle={subtitle}
                        as="h1"
                        variant="h1"
                        center
                        className="text-background! uppercase tracking-wide"
                        subtitleClassName="text-background/60! tracking-wide"
                    />
                </motion.div>
            </Container>
        </section>
    );
};

export default PageBanner;
