"use client";

import React from "react";
import { FaRegStar, FaStar, FaStarHalfStroke } from "react-icons/fa6";

interface StarRatingProps {
    rating: number;
    maxRating?: number;
    size?: number;
    className?: string;
    activeColor?: string;
    inactiveColor?: string;
    interactive?: boolean;
    onRate?: (rating: number) => void;
    showText?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({
    rating,
    maxRating = 5,
    size = 18,
    className = "",
    activeColor = "text-warning",
    inactiveColor = "text-muted-foreground/30",
    interactive = false,
    onRate,
    showText = false,
}) => {
    const [hoverRating, setHoverRating] = React.useState<number | null>(null);

    const displayRating = hoverRating !== null ? hoverRating : rating;

    const stars = [];
    for (let i = 1; i <= maxRating; i++) {
        const isFull = i <= Math.floor(displayRating);
        const isHalf = !isFull && i <= Math.ceil(displayRating) && displayRating % 1 !== 0;

        stars.push(
            <button
                key={i}
                type="button"
                disabled={!interactive}
                onClick={() => interactive && onRate?.(i)}
                onMouseEnter={() => interactive && setHoverRating(i)}
                onMouseLeave={() => interactive && setHoverRating(null)}
                className={`${interactive ? "cursor-pointer transition-transform hover:scale-110" : "cursor-default"} focus:outline-none`}
                aria-label={`Rate ${i} out of ${maxRating}`}
            >
                {isFull ? (
                    <FaStar size={size} className={`${activeColor} ${className}`} />
                ) : isHalf ? (
                    <FaStarHalfStroke size={size} className={`${activeColor} ${className}`} />
                ) : (
                    <FaRegStar size={size} className={`${inactiveColor} ${className}`} />
                )}
            </button>
        );
    }

    return (
        <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">{stars}</div>
            {showText && (
                <span className="text-sm font-semibold text-foreground leading-none pt-0.5">
                    {rating.toFixed(1)}
                </span>
            )}
        </div>
    );
};

export default StarRating;

