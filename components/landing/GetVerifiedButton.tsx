"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import Button from "@/components/ui/Button";
import useUIStore from "@/hooks/useUIStore";

/** Logged-in users go to their profile to verify; everyone else is asked to log in first. */
export default function GetVerifiedButton({ isLoggedIn }: { isLoggedIn: boolean }) {
    const router = useRouter();
    const uiStore = useUIStore();

    const handleClick = useCallback(() => {
        if (isLoggedIn) router.push("/dashboard/profile");
        else uiStore.onOpen("login");
    }, [isLoggedIn, router, uiStore]);

    return <Button label="Get verified" onClick={handleClick} variant="success" rounded fit />;
}
