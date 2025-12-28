import React, { useId, useMemo } from 'react';

type Props = {
    label: string;
    isChecked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    required?: boolean;
    name?: string;
    value?: string;
    className?: string;
    labelClassName?: string;
    'aria-describedby'?: string;
    'aria-label'?: string;
};

const Checkbox = React.memo<Props>(({
    label,
    isChecked,
    onChange,
    disabled = false,
    required = false,
    name,
    value,
    className = '',
    labelClassName = '',
    'aria-describedby': ariaDescribedBy,
    'aria-label': ariaLabel,
}) => {
    const id = useId();
    const checkboxId = useMemo(() => `checkbox-${id}`, [id]);

    return (
        <div className={`flex items-center ${className}`}>
            <input
                id={checkboxId}
                type="checkbox"
                name={name}
                value={value}
                checked={isChecked}
                onChange={onChange}
                disabled={disabled}
                required={required}
                aria-describedby={ariaDescribedBy}
                aria-label={ariaLabel || (label ? undefined : label)}
                aria-checked={isChecked}
                className="w-4.5 h-4.5 accent-black bg-gray-100 border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1 cursor-pointer checked:bg-black checked:border-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            />
            <label
                htmlFor={checkboxId}
                className={`ml-2 text-sm font-medium text-gray-900 leading-none cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${labelClassName}`}
            >
                {label}
                {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
            </label>
        </div>
    );
});

Checkbox.displayName = 'Checkbox';

export default Checkbox;