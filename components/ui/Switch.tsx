"use client";

import React from "react";
import { FaBolt } from "react-icons/fa";
import ReactSwitch, { ReactSwitchProps } from "react-switch";

interface SwitchProps extends Partial<ReactSwitchProps> {
    variant?: "default" | "bolt";
}

const Switch: React.FC<SwitchProps> = ({ variant = "default", ...props }) => {
    const isBolt = variant === "bolt";

    return (
        <ReactSwitch
            onChange={props.onChange ?? (() => { })}
            checked={props.checked ?? false}
            offColor="#D4D4D4" // Fallback to neutral-300 hex
            onColor="#000000"  // Fallback to foreground hex
            uncheckedIcon={false}
            checkedIcon={false}
            height={28}
            width={56}
            handleDiameter={22}
            offHandleColor="#FFFFFF"
            onHandleColor="#FFFFFF"
            activeBoxShadow="0 0 2px 3px rgba(0, 0, 0, 0.1)"
            checkedHandleIcon={
                isBolt ? (
                    <div className="flex items-center justify-center h-full">
                        <FaBolt className="text-warning w-3.5 h-3.5" />
                    </div>
                ) : undefined
            }
            {...props}
        />
    );
};

export default Switch;
