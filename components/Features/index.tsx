"use client";
import React from "react";

import SectionHeader from "@/components/Common/SectionHeader";

import featuresData from "./featuresData";
import SingleFeature from "./SingleFeature";

const Feature = () => {
  return (
    <>
      
      <section id="features" className="py-20 lg:py-25 xl:py-30">
        <div className="mx-auto max-w-c-1315 px-4 md:px-8 xl:px-0">
          
          <SectionHeader
            headerInfo={{
              title: "For Creators - By Creators",
              subtitle: "Together, Let's Redefine Content Creation",
              description: `Whether you're a seasoned professional or a budding creative, ContCave empowers you`,
            }}
          />
          

          <div className="mt-12.5 grid grid-cols-1 gap-7.5 md:grid-cols-2 lg:mt-15 lg:grid-cols-3 xl:mt-20 xl:gap-12.5">
            

            {featuresData.map((feature, key) => (
              <SingleFeature feature={feature} key={key} />
            ))}

            
          </div>
        </div>
      </section>

      
    </>
  );
};

export default Feature;
