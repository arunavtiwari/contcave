import Link from "next/link";
import type { MouseEventHandler } from "react";
import { IoLogoWhatsapp } from "react-icons/io";

import { cn } from "@/lib/utils";

type WhatsAppLinkButtonProps = {
    href: string;
    label: string;
    onClick?: MouseEventHandler<HTMLAnchorElement>;
    disabled?: boolean;
    className?: string;
};

export default function WhatsAppLinkButton({ href, label, onClick, disabled = false, className }: WhatsAppLinkButtonProps) {
    return (
        <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClick}
            aria-disabled={disabled}
            tabIndex={disabled ? -1 : undefined}
            className={cn(
                "flex items-center justify-center gap-2.5 w-full rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] transition-colors px-4 py-3.5 text-white font-semibold text-sm shadow-sm",
                disabled && "pointer-events-none opacity-50",
                className
            )}
        >
            <IoLogoWhatsapp size={20} />
            {label}
        </Link>
    );
}
