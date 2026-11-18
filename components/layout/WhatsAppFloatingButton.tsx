"use client";

import Link from "next/link";
import { IoLogoWhatsapp } from "react-icons/io";

import { floatingButton } from "@/components/ui/floatingButton";
import Tooltip from "@/components/ui/Tooltip";
import { useStudioPageUrl } from "@/hooks/useStudioPageUrl";
import { buildWhatsAppUrl, generalEnquiryMessage } from "@/lib/whatsapp/urls";

export default function WhatsAppFloatingButton() {
    const studioUrl = useStudioPageUrl();
    const href = buildWhatsAppUrl(generalEnquiryMessage(studioUrl));

    return (
        <Tooltip content="Any special requirements? Chat with us" side="left">
            <Link
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat with ContCave on WhatsApp"
                data-tracking-source="floating_button"
                className={floatingButton({ tone: "whatsapp" })}
            >
                <IoLogoWhatsapp aria-hidden="true" className="size-6" />
            </Link>
        </Tooltip>
    );
}
