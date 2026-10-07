import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { IoLogoWhatsapp } from "react-icons/io";

import { cn } from "@/lib/utils";

type WhatsAppLinkButtonProps = Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "target" | "rel" | "children"> & {
    href: string;
    label: string;
    disabled?: boolean;
};

export default function WhatsAppLinkButton({ href, label, disabled = false, className, ...props }: WhatsAppLinkButtonProps) {
    return (
        <Link
            {...props}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
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
