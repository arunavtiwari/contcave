"use client";

import React from "react";

import { CategoryProvider } from "./CategoryProvider";
import { ConsentProvider } from "./ConsentProvider";
import NextAuthProvider from "./NextAuthProvider";

interface GlobalProvidersProps {
    children: React.ReactNode;
}

export default function GlobalProviders({ children }: GlobalProvidersProps) {
    return (
        <NextAuthProvider>
            <ConsentProvider>
                <CategoryProvider>
                    {children}
                </CategoryProvider>
            </ConsentProvider>
        </NextAuthProvider>
    );
}
