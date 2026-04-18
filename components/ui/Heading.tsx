import React from "react";

type HeadingVariant = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

interface HeadingProps extends Omit<React.HTMLAttributes<HTMLHeadingElement>, "title"> {
    title: React.ReactNode;
    subtitle?: string;
    center?: boolean;
    as?: HeadingVariant;
    variant?: HeadingVariant;
    isLanding?: boolean;
}

const Heading: React.FC<HeadingProps> = ({
    title,
    subtitle,
    center,
    as,
    variant = "h3",
    isLanding = false,
    className = "",
    ...props
}) => {
    const Component = as || variant || "h2";

    const variants: Record<HeadingVariant, string> = {
        h1: isLanding ? "text-[#FAF7F2]" : "text-4xl font-extrabold",
        h2: "text-3xl font-bold",
        h3: "text-2xl font-bold",
        h4: "text-xl font-bold",
        h5: "text-lg font-bold",
        h6: "text-base font-bold",
    };

    const landingSizes: Record<HeadingVariant, string> = {
        h1: "text-[clamp(2rem,5vw,4.2rem)] font-black leading-[1.05]",
        h2: "text-[clamp(1.9rem,3.2vw,2.8rem)] font-bold leading-[1.15]",
        h3: "text-[clamp(1.4rem,2.2vw,1.9rem)] font-bold leading-[1.25]",
        h4: "text-xl font-bold",
        h5: "text-lg font-bold",
        h6: "text-base font-bold",
    };

    const subtitleVariants: Record<HeadingVariant, string> = {
        h1: "text-xl",
        h2: "text-lg",
        h3: "text-base",
        h4: "text-sm",
        h5: "text-xs",
        h6: "text-xs",
    };

    const fontClass = isLanding ? "font-serif" : "";
    const sizeClass = isLanding ? landingSizes[variant] : variants[variant];
    const textColorClass = (isLanding && variant === "h1") ? "text-[#FAF7F2]" : "text-foreground";

    return (
        <div className={`${center ? "text-center" : "text-start"} ${className}`}>
            <Component
                className={`${fontClass} ${sizeClass} ${textColorClass}`}
                {...props}
            >
                {title}
            </Component>
            {subtitle && (
                <p className={`text-muted-foreground ${isLanding ? "mt-2" : "mt-1"} font-light ${subtitleVariants[variant]}`}>
                    {subtitle}
                </p>
            )}
        </div>
    );
};

export default Heading;
