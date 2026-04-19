"use client";

import { motion } from "framer-motion";
import React from "react";

import Container from "@/components/Container";
import PageBanner from "@/components/ui/PageBanner";

interface ContentLayoutProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    bannerImage?: string;
}

const ContentLayout: React.FC<ContentLayoutProps> = ({
    title,
    subtitle,
    children,
    bannerImage,
}) => {
    return (
        <main className="bg-background min-h-screen">
            <PageBanner title={title} subtitle={subtitle} image={bannerImage} />

            <section className="py-20 -mt-10 relative z-20">
                <Container>
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.5 }}
                        className="bg-background rounded-3xl border border-border p-8 md:p-12 lg:p-16 shadow-sm max-w-5xl mx-auto"
                    >
                        <div className="prose prose-neutral max-w-none text-muted-foreground leading-relaxed selection:bg-foreground selection:text-background prose-headings:text-foreground prose-headings:font-bold prose-strong:text-foreground">
                            {children}
                        </div>
                    </motion.div>
                </Container>
            </section>
        </main>
    );
};

export default ContentLayout;
