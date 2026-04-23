"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

interface CategoryContextType {
    category: string;
    changeCategory: (cat: string) => void;
}

interface CategoryProviderProps {
    children: React.ReactNode;
}

const CategoryContext = createContext<CategoryContextType | null>(null);

// --- Provider ---

export const CategoryProvider: React.FC<CategoryProviderProps> = ({ children }) => {
    const [category, setCategory] = useState<string>("");

    const changeCategory = (cat: string) => {
        setCategory(cat);
    };

    const value = useMemo(() => ({
        category,
        changeCategory
    }), [category]);

    return (
        <CategoryContext.Provider value={value}>
            {children}
        </CategoryContext.Provider>
    );
};

// --- Hook ---

export const useCategory = (): CategoryContextType => {
    const context = useContext(CategoryContext);

    if (!context) {
        throw new Error("useCategory must be used within a CategoryProvider");
    }

    return context;
};
