import React from 'react';
type Props = {
    label: string;
    isChecked: any;
    onChange: (value: any) => void;
};
const Checkbox = ({ label, isChecked, onChange }: Props) => {
    return (
        <div className="flex items-center">
            <input
                type="checkbox"
                value=""
                className="w-4.5 h-4.5 text-black bg-gray-100 rounded-full border-gray-300 focus:outline-none focus:ring-transparent"
                checked={isChecked}
                onChange={onChange}
            />
            <label className="ml-2 text-sm font-medium text-gray-900 ">{label}</label>
        </div>

    );
};

export default Checkbox;