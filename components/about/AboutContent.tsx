"use client";

import AboutCTA from "./AboutCTA";
import AboutStory from "./AboutStory";
import AboutValues from "./AboutValues";
import AboutVision from "./AboutVision";

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
