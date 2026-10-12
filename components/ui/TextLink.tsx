import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const textLinkVariants = cva("transition-colors", {
  variants: {
    variant: {
      default: "font-semibold text-foreground underline underline-offset-4",
      muted: "text-sm text-muted-foreground hover:text-foreground",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type Props = ComponentProps<typeof Link> & VariantProps<typeof textLinkVariants>;

export default function TextLink({ variant, className, ...props }: Props) {
  return <Link className={cn(textLinkVariants({ variant }), className)} {...props} />;
}
