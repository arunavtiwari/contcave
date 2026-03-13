import React from "react";

type HeadingVariant = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
    title: string;
    subtitle?: string;
    center?: boolean;
    as?: HeadingVariant;
    variant?: HeadingVariant;
}

const Heading: React.FC<HeadingProps> = ({
    title,
    subtitle,
    center,
    as,
    variant = "h2",
    className = "",
    ...props
}) => {
    const Component = as || variant || "h2";

    const variants: Record<HeadingVariant, string> = {
        h1: "text-4xl font-extrabold",
        h2: "text-3xl font-bold",
        h3: "text-2xl font-bold",
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

    return (
        <div className={`${center ? "text-center" : "text-start"} ${className}`}>
            <Component
                className={`${variants[variant]} text-gray-900`}
                {...props}
            >
                {title}
            </Component>
            {subtitle && (
                <p className={`text-gray-500 mt-1 font-light ${subtitleVariants[variant]}`}>
                    {subtitle}
                </p>
            )}
        </div>
    );
};

export default Heading;
