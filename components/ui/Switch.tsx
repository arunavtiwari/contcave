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
            offColor="var(--color-neutral-300)"
            onColor="var(--color-foreground)"
            uncheckedIcon={false}
            offHandleColor="var(--color-foreground)"
            activeBoxShadow="0 0 2px 3px var(--color-foreground)"
            checkedIcon={false}
            height={30}
            handleDiameter={20}
            checkedHandleIcon={
                isBolt ? <FaBolt color="var(--color-warning)" className="w-full h-full py-0.5" /> : undefined
            }
            {...props}
        />
    );
};

export default Switch;
