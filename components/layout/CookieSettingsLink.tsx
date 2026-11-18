"use client";

import { useConsent } from "@/components/providers/ConsentProvider";
import { textLinkVariants } from "@/components/ui/TextLink";
import { cn } from "@/lib/utils";

export default function CookieSettingsLink() {
  const { openPreferences } = useConsent();

  return (
    <button type="button" onClick={openPreferences} className={cn(textLinkVariants({ variant: "muted" }), "cursor-pointer text-center md:text-left")}>
      Cookie settings
    </button>
  );
}
