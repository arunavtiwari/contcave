import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  center?: boolean;
  topPadding?: boolean;
  headingSmall?: boolean;
};

function Heading({ title, subtitle, center, topPadding, headingSmall }: Props) {
  return (
    <div className={`${center ? "text-center" : "text-start"} ${topPadding ? "pt-10" : "pt-0"}`}>
      <h1 className={`${headingSmall ? "text-xl" : "text-3xl"} font-bold text-gray-900`}>
        {title}
      </h1>
      {subtitle && (
        <p className="text-gray-600 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

export default Heading;
