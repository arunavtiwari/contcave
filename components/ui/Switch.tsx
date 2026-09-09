"use client";

import React from "react";
import { FaBolt } from "react-icons/fa";
import ReactSwitch, { ReactSwitchProps } from "react-switch";

import FormField from "@/components/ui/FormField";

export interface SwitchProps extends Partial<ReactSwitchProps> {
    styleVariant?: "default" | "bolt";
    size?: "default" | "sm";
    label?: string;
    description?: string;
    required?: boolean;
    variant?: "vertical" | "horizontal";
    error?: string;
    labelWidth?: string;
    childWidth?: "full" | "auto";
}

const Switch: React.FC<SwitchProps> = ({
    styleVariant = "default",
    size = "default",
    label,
    description,
    required,
    variant = "vertical",
    error,
    labelWidth,
    childWidth,
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
            labelWidth={labelWidth}
            childWidth={childWidth}
        >
            <ReactSwitch
                onChange={props.onChange ?? (() => { })}
                checked={props.checked ?? false}
                offColor="#E5E5E5"
                onColor="#171717"
                uncheckedIcon={false}
                checkedIcon={false}
                height={isSmall ? 22 : 26}
                width={isSmall ? 40 : 48}
                handleDiameter={isSmall ? 16 : 20}
                offHandleColor="#FFFFFF"
                onHandleColor="#FFFFFF"
                boxShadow="0 1px 2px rgba(0, 0, 0, 0.08)"
                activeBoxShadow="0 0 0 3px rgba(0, 0, 0, 0.08)"
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
