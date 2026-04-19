import React from "react";

type HeadingVariant = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

interface HeadingProps extends Omit<React.HTMLAttributes<HTMLHeadingElement>, "title"> {
    title: React.ReactNode;
    subtitle?: string;
    subtitleClassName?: string;
    center?: boolean;
    as?: HeadingVariant;
    variant?: HeadingVariant;
}

const Heading: React.FC<HeadingProps> = ({
    title,
    subtitle,
    subtitleClassName = "",
    center,
    as,
    variant = "h3",
    className = "",
    ...props
}) => {
    const Component = as || variant || "h2";

    const sizes: Record<HeadingVariant, string> = {
        h1: "text-[clamp(2.5rem,6vw,4.2rem)] font-semibold leading-[1.05] tracking-tight",
        h2: "text-[clamp(2rem,4vw,2.8rem)] font-bold leading-[1.1] tracking-tight",
        h3: "text-[clamp(1.5rem,3vw,2rem)] font-bold leading-[1.2] tracking-tight",
        h4: "text-[clamp(1.2rem,2.5vw,1.6rem)] font-bold leading-[1.3]",
        h5: "text-lg font-bold leading-[1.4]",
        h6: "text-base font-bold leading-[1.5]",
    };

    const subtitleSizes: Record<HeadingVariant, string> = {
        h1: "text-lg md:text-xl",
        h2: "text-base md:text-lg",
        h3: "text-base",
        h4: "text-sm",
        h5: "text-xs",
        h6: "text-xs",
    };

    const fontClass = "font-serif";
    const sizeClass = sizes[variant];
    const textColorClass = "text-foreground";

    return (
        <div className={`${center ? "text-center" : "text-start"}`}>
            <Component
                className={`${fontClass} ${sizeClass} ${textColorClass} ${className}`}
                {...props}
            >
                {title}
            </Component>
            {subtitle && (
                <p className={`text-muted-foreground ${subtitleSizes[variant]} ${subtitleClassName}`}>
                    {subtitle}
                </p>
            )}
        </div>
    );
};

export default Heading;
