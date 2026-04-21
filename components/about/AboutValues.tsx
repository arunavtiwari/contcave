"use client";
import { motion } from "framer-motion";
import { Building2, Heart, Users } from "lucide-react";
import React from "react";

import Heading from "@/components/ui/Heading";
import SectionHeader from "@/components/ui/SectionHeader";

const VALUES = [
    {
        icon: Building2,
        title: "Space Utilisation",
        body: "No creative space should go to waste, whether it's a cafe, a studio, or a hidden corner. Every space can inspire art.",
    },
    {
        icon: Heart,
        title: "Human Creativity",
        body: "Technology may evolve, but human creativity is timeless. We exist to give it space, voice, and longevity.",
    },
    {
        icon: Users,
        title: "Community First",
        body: "Our vision is to build a community where creators support each other, share spaces, and thrive together.",
    },
];

const AboutValues = () => {
    return (
        <section>
            <SectionHeader
                badge="Our Values"
                title="What We Stand For"
                center
                className="mb-16"
            />
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {VALUES.map((value, i) => (
                    <motion.div
                        key={value.title}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        viewport={{ once: true }}
                        className="group relative flex flex-col gap-6 rounded-3xl border border-border bg-background p-8 shadow-sm transition-all duration-300 hover:shadow-md hover:border-foreground/10"
                    >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm text-background bg-foreground/80 transition-transform group-hover:scale-110">
                            <value.icon size={24} />
                        </div>
                        <div className="space-y-3">
                            <Heading title={value.title} variant="h4" />
                            <p className="text-sm leading-relaxed text-muted-foreground font-light">
                                {value.body}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
};

export default AboutValues;

