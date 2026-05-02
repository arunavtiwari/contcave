import { cva, type VariantProps } from "class-variance-authority";
import { IndianRupee } from "lucide-react";
import * as React from "react";
import { FieldErrors, UseFormRegisterReturn } from "react-hook-form";

import FormField from "@/components/inputs/FormField";
import { cn } from "@/lib/utils";

const inputVariants = cva(
    "flex items-center w-full bg-background border rounded-xl transition disabled:opacity-70 disabled:cursor-not-allowed text-foreground group",
    {
        variants: {
            size: {
                sm: "h-10 text-sm",
                md: "h-11 text-sm",
            },
            error: {
                true: "border-destructive focus-within:border-destructive",
                false: "border-border hover:border-border/80 focus-within:border-foreground",
            },
        },
        defaultVariants: {
            size: "sm",
            error: false,
        },
    }
);

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "onChange">, VariantProps<typeof inputVariants> {
    label?: string;
    description?: string;
    register?: UseFormRegisterReturn;
    id: string;
    errors?: FieldErrors;
    customLeftContent?: React.ReactNode;
    customRightContent?: React.ReactNode;
    variant?: "vertical" | "horizontal";
    onNumberChange?: (value: number) => void;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    formatPrice?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({
        className,
        type = "text",
        label,
        description,
        formatPrice,
        register,
        id,
        required,
        errors,
        customLeftContent,
        customRightContent,
        variant = "vertical",
        size,
        onNumberChange,
        onChange,
        ...props
    }, ref) => {
        const errorMsg = errors?.[id]?.message as string;
        const hasError = !!errorMsg;

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (type === "number") {
                e.target.value = e.target.value.replace(/\D/g, "");
                if (onNumberChange) {
                    const val = parseInt(e.target.value, 10);
                    onNumberChange(isNaN(val) ? 0 : val);
                }
            }
            if (onChange) onChange(e);
            if (register?.onChange) register.onChange(e);
        };

        const renderedType = type === "number" ? "text" : type;
        const inputMode = type === "number" ? "numeric" : props.inputMode;

        return (
            <FormField
                id={id}
                label={label}
                description={description}
                error={errorMsg}
                required={required}
                variant={variant}
            >
                <div className={cn(
                    inputVariants({
                        size,
                        error: hasError,
                    }),
                    className
                )}>
                    {customLeftContent && (
                        <div className="pl-4 pr-1 flex items-center justify-center pointer-events-none text-muted-foreground text-sm select-none shrink-0">
                            {customLeftContent}
                        </div>
                    )}

                    {formatPrice && (
                        <div className="pl-4 pr-1 flex items-center justify-center pointer-events-none text-muted-foreground shrink-0">
                            <IndianRupee size={size === "sm" ? 14 : 18} />
                        </div>
                    )}

                    <input
                        id={id}
                        type={renderedType}
                        inputMode={inputMode}
                        className={cn(
                            "flex-1 bg-transparent border-none focus:ring-0 outline-none h-full w-full pr-4 min-w-0 text-sm",
                            (!customLeftContent && !formatPrice) && "pl-4"
                        )}
                        ref={ref}
                        required={required}
                        {...register}
                        onChange={handleChange}
                        {...props}
                        onWheel={(e) => {
                            if (type === 'number') {
                                (e.target as HTMLInputElement).blur();
                            }
                        }}
                    />

                    {customRightContent && (
                        <div className="pr-3 flex items-center justify-center shrink-0">
                            {customRightContent}
                        </div>
                    )}
                </div>
            </FormField>
        );
    }
);
Input.displayName = "Input";

export default Input;

