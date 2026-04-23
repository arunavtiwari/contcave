"use client";

import React from "react";

import { CategoryProvider } from "./CategoryProvider";
import NextAuthProvider from "./NextAuthProvider";

interface GlobalProvidersProps {
    children: React.ReactNode;
}

export default function GlobalProviders({ children }: GlobalProvidersProps) {
    return (
        <NextAuthProvider>
            <CategoryProvider>
                {children}
            </CategoryProvider>
        </NextAuthProvider>
    );
}
