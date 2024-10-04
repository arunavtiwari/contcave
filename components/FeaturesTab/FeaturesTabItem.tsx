import React from "react";
import { FeatureTab } from "@/types/featureTab";
import Image from "next/image";
import SectionHeader from "../Common/SectionHeader";

const FeaturesTabItem = ({ featureTab }: { featureTab: FeatureTab }) => {
  const { title, desc1, desc2, image, imageDark } = featureTab;

  return (
    <>
      <div className="flex items-center gap-8 lg:gap-19">
        <div className="md:w-1/2">

          <h2 className="mb-7 text-3xl font-bold text-black xl:text-sectiontitle2">
            {title}
          </h2>
          <p className="mb-5">{desc1}</p>
          <p className="w-11/12">{desc2}</p>
        </div>

        <div className="relative mx-auto aspect-[562/366] max-w-[550px] md:block md:w-1/2">
          <Image
            src={image}
            alt={title}
            fill
            className="rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
          />
          <Image
            src={imageDark}
            alt={title}
            fill
            className="absolute top-0 left-0 rounded-lg shadow-lg opacity-0 hover:opacity-100 transition-opacity duration-300"
          />
        </div>

      </div>
    </>
  );
};

export default FeaturesTabItem;
