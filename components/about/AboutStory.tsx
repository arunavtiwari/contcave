"use client";
import { motion } from "framer-motion";
import React from "react";

import SectionHeader from "@/components/ui/SectionHeader";

const AboutStory = () => {
    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
        >
            <SectionHeader badge="The Journey" title="Our Story" center />
            <div className="space-y-6 text-lg text-muted-foreground font-light leading-relaxed text-center mt-8">
                <p>
                    We started <strong className="text-foreground font-semibold">ContCave</strong> with one belief: no creative
                    idea should be left unrealized just because the right space wasn&apos;t
                    accessible. Every cafÃƒÂ© corner, every studio, every underused nook
                    deserves a chance to tell a story.
                </p>
                <p>
                    As part of <strong className="text-foreground font-semibold">Arkanet Ventures LLP</strong>, our mission is
                    to sustain, drive, and grow human art by making creative spaces
                    discoverable, accessible, and celebrated.
                </p>
            </div>
        </motion.section>
    );
};

export default AboutStory;

