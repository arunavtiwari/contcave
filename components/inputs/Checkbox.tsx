import React from 'react';
type Props = {
    label: string;
    isChecked: any;
    onChange: (value: any) => void;
};
const Checkbox = ({ label, isChecked, onChange }: Props) => {
    return (
        <div className="flex items-center">
            <input type="checkbox" value="" className="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" checked={isChecked} onChange={onChange}></input>
            <label className="ml-2 text-sm font-medium text-gray-900 ">{label}</label>
        </div>

    );
};

export default Checkbox;