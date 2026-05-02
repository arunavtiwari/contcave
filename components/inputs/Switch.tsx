"use client";

import React from "react";
import { FaBolt } from "react-icons/fa";
import ReactSwitch, { ReactSwitchProps } from "react-switch";

import FormField from "./FormField";

interface SwitchProps extends Partial<ReactSwitchProps> {
    styleVariant?: "default" | "bolt";
    size?: "default" | "sm";
    label?: string;
    description?: string;
    required?: boolean;
    variant?: "vertical" | "horizontal";
    error?: string;
}

const Switch: React.FC<SwitchProps> = ({
    styleVariant = "default",
    size = "default",
    label,
    description,
    required,
    variant = "vertical",
    error,
    ...props
}) => {
    const isBolt = styleVariant === "bolt";
    const isSmall = size === "sm";

    return (
        <FormField
            label={label}
            description={description}
            required={required}
            variant={variant}
            error={error}
        >
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
        </FormField>
    );
};

export default Switch;
