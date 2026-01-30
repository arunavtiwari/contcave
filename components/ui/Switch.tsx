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
            offColor="#d1d5db"
            onColor="#000"
            uncheckedIcon={false}
            offHandleColor="#000"
            activeBoxShadow="0 0 2px 3px #000"
            checkedIcon={false}
            height={30}
            handleDiameter={20}
            checkedHandleIcon={
                isBolt ? <FaBolt color="#FFD700" className="w-full h-full py-[2px]" /> : undefined
            }
            {...props}
        />
    );
};

export default Switch;
