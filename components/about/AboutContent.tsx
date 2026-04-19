"use client";
import React from "react";

import AboutStory from "./AboutStory";
import AboutValues from "./AboutValues";
import AboutVision from "./AboutVision";
import AboutCTA from "./AboutCTA";

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
