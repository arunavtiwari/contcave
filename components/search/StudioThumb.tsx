import Image from "next/image";
import { IoCameraOutline } from "react-icons/io5";

import { cn } from "@/lib/utils";

export default function StudioThumb({ image, className }: { image: string | null; className?: string }) {
    return (
        <span className={cn("relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background text-foreground", className)}>
            {image ? <Image src={image} alt="" fill sizes="56px" className="object-cover" /> : <IoCameraOutline size={18} aria-hidden />}
        </span>
    );
}
