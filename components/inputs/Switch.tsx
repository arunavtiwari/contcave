"use client";

import React from "react";
import { FaBolt } from "react-icons/fa";
import ReactSwitch, { ReactSwitchProps } from "react-switch";

interface SwitchProps extends Partial<ReactSwitchProps> {
    variant?: "default" | "bolt";
    size?: "default" | "sm";
}

const Switch: React.FC<SwitchProps> = ({ variant = "default", size = "default", ...props }) => {
    const isBolt = variant === "bolt";
    const isSmall = size === "sm";

    return (
        <ReactSwitch
            onChange={props.onChange ?? (() => { })}
            checked={props.checked ?? false}
            offColor="#D4D4D4"
            onColor="#000000"
            uncheckedIcon={false}
            checkedIcon={false}
            height={isSmall ? 24 : 28}
            width={isSmall ? 44 : 56}
            handleDiameter={isSmall ? 16 : 22}
            offHandleColor="#FFFFFF"
            onHandleColor="#FFFFFF"
            activeBoxShadow="0 0 2px 3px rgba(0, 0, 0, 0.1)"
            checkedHandleIcon={
                isBolt ? (
                    <div className="flex items-center justify-center h-full">
                        <FaBolt className={isSmall ? "text-warning w-2.5 h-2.5" : "text-warning w-3.5 h-3.5"} />
                    </div>
                ) : undefined
            }
            {...props}
        />
    );
};

export default Switch;
