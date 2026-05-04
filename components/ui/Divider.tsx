import React from "react";

interface DividerProps {
  className?: string;
  orientation?: "horizontal" | "vertical";
}

const Divider: React.FC<DividerProps> = ({ 
  className = "", 
  orientation = "horizontal" 
}) => {
  if (orientation === "vertical") {
    return <div className={`w-px bg-border/40 ${className}`} role="separator" aria-orientation="vertical" />;
  }
  return <hr className={`border-border/40 ${className}`} role="separator" aria-orientation="horizontal" />;
};

export default Divider;
