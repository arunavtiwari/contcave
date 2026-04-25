import { cva, type VariantProps } from "class-variance-authority";
import { IndianRupee } from "lucide-react";
import * as React from "react";
import { FieldErrors, UseFormRegisterReturn } from "react-hook-form";

import FormField from "@/components/inputs/FormField";
import { cn } from "@/lib/utils";

const inputVariants = cva(
    "w-full font-normal bg-background border rounded-xl transition outline-none disabled:opacity-70 disabled:cursor-not-allowed pr-3 text-foreground",
    {
        variants: {
            size: {
                sm: "h-10 text-xs",
                md: "h-11 text-sm",
            },
            error: {
                true: "border-destructive focus:border-destructive focus:ring-1 focus:ring-destructive/20",
                false: "border-border hover:border-border/80 focus:border-foreground focus:ring-1 focus:ring-foreground/10",
            },
            formatPrice: {
                true: "",
                false: "",
            },
            hasLeftContent: {
                true: "",
                false: "pl-3",
            }
        },
        compoundVariants: [
            { formatPrice: true, size: "sm", className: "pl-9" },
            { formatPrice: true, size: "md", className: "pl-12" },
            { hasLeftContent: true, formatPrice: false, className: "pl-11" },
        ],
        defaultVariants: {
            size: "md",
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
                <div className="relative group">
                    {customLeftContent && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none text-muted-foreground text-sm select-none z-10">
                            {customLeftContent}
                        </div>
                    )}

                    {formatPrice && (
                        <IndianRupee
                            size={size === "sm" ? 14 : 18}
                            className="text-muted-foreground absolute top-1/2 -translate-y-1/2 left-4 pointer-events-none z-10"
                        />
                    )}

                    <input
                        id={id}
                        type={renderedType}
                        inputMode={inputMode}
                        className={cn(
                            inputVariants({
                                size,
                                error: hasError,
                                formatPrice: !!formatPrice,
                                hasLeftContent: !!customLeftContent,
                                className
                            })
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
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
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

