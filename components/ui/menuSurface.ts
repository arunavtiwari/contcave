import { cva, type VariantProps } from "class-variance-authority";

/** Gap between a trigger and its menu or popover. */
export const MENU_OFFSET = 12;

/**
 * The floating panel shared by DropdownMenu and Popover. Radix renders it in a portal at the end of
 * <body>, so a glass panel blurs the page behind it rather than its trigger's container.
 */
export const menuSurface = cva(
  "z-100000 overflow-hidden text-sm data-[state=open]:animate-menu-in data-[state=closed]:animate-menu-out",
  {
    variants: {
      surface: {
        /** Navbar menus: frosted glass, as on main. */
        glass: "rounded-2xl border border-neutral-300 bg-background/70 ring-1 ring-neutral-300/70 backdrop-blur-lg",
        /** Solid panel for controls inside page content, such as sorting. */
        solid: "rounded-2xl border border-border bg-background py-1 shadow-xl",
        /** Small action menus on cards. */
        card: "flex flex-col gap-0.5 rounded-xl border border-border bg-background/95 p-1 shadow-lg backdrop-blur-xl",
      },
    },
    defaultVariants: { surface: "glass" },
  }
);

export type MenuSurfaceProps = VariantProps<typeof menuSurface>;
