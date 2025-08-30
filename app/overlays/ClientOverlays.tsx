"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ToastContainerBar = dynamic(() => import("@/components/ToastContainerBar"));
const SearchModal = dynamic(() => import("@/components/modals/SearchModal"));
const RegisterModal = dynamic(() => import("@/components/modals/RegisterModal"));
const LoginModal = dynamic(() => import("@/components/modals/LoginModal"));
const OwnerRegisterModal = dynamic(() => import("@/components/modals/OwnerRegisterModal"));
const RentModal = dynamic(() => import("@/components/modals/RentModal"));
const CookieConsent = dynamic(() => import("@/components/CookieConsentBanner"));

export default function ClientOverlays() {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        const id =
            typeof requestIdleCallback === "function"
                ? requestIdleCallback(() => setReady(true))
                : setTimeout(() => setReady(true), 200);
        return () => {
            if (typeof id === "number") clearTimeout(id);
            else if (typeof cancelIdleCallback === "function") cancelIdleCallback(id as any);
        };
    }, []);

    if (!ready) return null;

    return (
        <>
            <ToastContainerBar />
            <SearchModal />
            <RegisterModal />
            <LoginModal />
            <OwnerRegisterModal />
            <RentModal />
            <CookieConsent />
        </>
    );
}
