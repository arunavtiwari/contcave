"use client";
import { motion } from "framer-motion";
import React from "react";

import Heading from "@/components/ui/Heading";
import SectionHeader from "@/components/ui/SectionHeader";

const MILESTONES = [
    {
        year: "2024",
        title: "The Spark",
        body: "We saw creators struggling to find affordable, accessible spaces for storytelling.",
        side: "left",
    },
    {
        year: "2025",
        title: "The Launch",
        body: "ContCave was born: a platform to repurpose every creative corner into a canvas.",
        side: "right",
    },
    {
        year: "Future",
        title: "The Ecosystem",
        body: "A community-led ecosystem where art sustains, drives, and grows, powered by shared spaces.",
        side: "left",
    },
];

const AboutVision = () => {
    return (
        <section className="relative overflow-hidden">
            <SectionHeader
                badge="The Roadmap"
                title="Our Vision"
                center
                className="mb-20"
            />

            <div className="relative max-w-4xl mx-auto">
                {/* Timeline Line */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-linear-to-b from-border via-border/60 to-transparent md:left-1/2 md:-ml-px" />

                <div className="space-y-16">
                    {MILESTONES.map((item, i) => (
                        <motion.div
                            key={item.year}
                            initial={{ opacity: 0, x: item.side === "left" ? -30 : 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.7, delay: i * 0.1 }}
                            viewport={{ once: true }}
                            className={`relative flex flex-col md:flex-row items-center gap-8 ${item.side === "right" ? "md:flex-row-reverse" : ""
                                }`}
                        >
                            {/* Timeline Dot */}
                            <div className="absolute left-8 md:left-1/2 -ml-2.25 w-4 h-4 rounded-full bg-foreground border-4 border-background shadow-sm z-10" />

                            {/* Content Card */}
                            <div
                                className={`ml-16 md:ml-0 md:w-1/2 ${item.side === "left" ? "md:text-right md:pr-16" : "md:pl-16"
                                    }`}
                            >
                                <span className="text-foreground font-bold tracking-widest text-sm">
                                    {item.year}
                                </span>
                                <Heading title={item.title} variant="h4" className="mt-1 mb-3" />
                                <p className="text-muted-foreground font-light leading-relaxed">
                                    {item.body}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default AboutVision;

