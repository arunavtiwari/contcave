"use client";

import { motion } from "framer-motion";
import Image from "next/image";

import Container from "@/components/Container";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";

const AboutHero = () => {
    return (
        <section className="relative h-[calc(100vh-80px)] min-h-120 flex items-center overflow-hidden bg-foreground py-20 lg:py-32">
            {/* Background Image with Overlay */}
            <motion.div
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.4, ease: "easeOut" }}
                className="absolute inset-0"
            >
                <Image
                    src="/images/blogs/studio.png"
                    alt="ContCave” Creator infrastructure for India"
                    fill
                    className="object-cover opacity-65"
                    priority
                />
                {/* Refined gradient overlay to match brand style */}
                <div className="absolute inset-0 bg-linear-to-b from-foreground/40 via-foreground/60 to-foreground" />
            </motion.div>

            <Container>
                <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto">
                    <motion.p
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="mb-4 text-xs font-medium uppercase tracking-accent text-background/55"
                    >
                        Our story
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="mb-6"
                    >
                        <Heading
                            title="Building the infrastructure for creative spaces"
                            variant="h1"
                            className="text-background! text-balance"
                        />
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.65, delay: 0.45 }}
                        className="mb-10 text-background/60 text-[clamp(0.9rem,1.6vw,1.1rem)] tracking-[0.01em] max-w-2xl font-light leading-relaxed"
                    >
                        Empowering the next generation of Indian creators with a curated network of production-ready studios and creative hubs.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                    >
                        <Button
                            label="Explore Our Network"
                            href="/home"
                            variant="secondary"
                            rounded
                            fit
                            size="lg"
                            classNames="px-10"
                        />
                    </motion.div>
                </div>
            </Container>
        </section>
    );
};

export default AboutHero;

