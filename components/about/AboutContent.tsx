"use client";

import AboutCTA from "@/components/about/AboutCTA";
import AboutStory from "@/components/about/AboutStory";
import AboutValues from "@/components/about/AboutValues";
import AboutVision from "@/components/about/AboutVision";

const AboutContent = () => {
    return (
        <div className="py-24 space-y-32">
            <AboutStory />
            <AboutValues />
            <AboutVision />
            <AboutCTA />
        </div>
    );
};

export default AboutContent;
