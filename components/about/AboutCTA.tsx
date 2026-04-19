"use client";
import { motion } from "framer-motion";
import Container from "@/components/Container";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";

const AboutCTA = () => {
    return (
        <section className="py-section">
            <Container>
                <div className="relative rounded-3xl overflow-hidden bg-background border-l-8 border-l-primary shadow-sm">
                    {/* Animated Background */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <motion.div
                            className="absolute -inset-14 bg-[radial-gradient(circle,var(--color-foreground)_1.5px,transparent_1.5px)] opacity-[0.08] bg-size-[28px_28px]"
                            animate={{ x: [0, 28, 0], y: [0, 28, 0] }}
                            transition={{ duration: 20, ease: "linear", repeat: Infinity }}
                        />
                    </div>

                    <div className="relative z-10 flex flex-col items-center text-center gap-10 px-6 py-12 md:px-10 md:py-16 xl:px-20 bg-background/40 backdrop-blur-[1px]">
                        <motion.div
                            variants={{ hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0 } }}
                            initial="hidden"
                            whileInView="visible"
                            transition={{ duration: 0.8, delay: 0.1 }}
                            viewport={{ once: true }}
                            className="flex flex-col items-center gap-6"
                        >
                            <p className="text-xs font-semibold uppercase tracking-accent text-foreground rounded-full border border-foreground/10 px-4 py-2 w-fit">
                                Take the plunge
                            </p>

                            <Heading
                                title="Join the First Wave"
                                subtitle="Be part of the movement to make creative spaces in India more accessible, celebrated, and sustainable."
                                variant="h2"
                                center
                            />

                            <Button
                                label="Get Involved"
                                href="https://docs.google.com/forms/d/e/1FAIpQLSdYngGwgLaHCYcejKqCvwsdhxykFbr2UxxCHdXusQrXDaubWA/viewform"
                                target="_blank"
                                size="lg"
                                rounded
                                fit
                            />
                        </motion.div>
                    </div>
                </div>
            </Container>
        </section>
    );
};

export default AboutCTA;
