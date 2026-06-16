"use client";

import Link from "next/link";
import { useState } from "react";
import { IoLogoWhatsapp } from "react-icons/io";

import { buildWhatsAppUrl, GENERAL_ENQUIRY_MESSAGE } from "@/lib/whatsapp";

export default function WhatsAppFloatingButton() {
    const [hovered, setHovered] = useState(false);
    const href = buildWhatsAppUrl(GENERAL_ENQUIRY_MESSAGE);

    return (
        <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with ContCave on WhatsApp"
            className="fixed bottom-6 right-5 z-50 flex items-center gap-2 group"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {hovered && (
                <span className="hidden md:inline-block bg-foreground text-background text-xs font-medium px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-right-2 duration-150">
                    Any special requirements? Chat with us
                </span>
            )}
            <div className="w-13 h-13 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200">
                <IoLogoWhatsapp size={28} className="text-white" />
            </div>
        </Link>
    );
}
