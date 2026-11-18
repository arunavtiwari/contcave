/**
 * The navbar menus' glass panel. Radix renders it in a portal at the end of <body>, outside the
 * navbar's own backdrop blur, so the blur picks up the page behind it.
 */
export const MENU_SURFACE =
  "z-100000 overflow-hidden rounded-2xl border border-neutral-300 bg-background/70 text-sm ring-1 ring-neutral-300/70 backdrop-blur-lg data-[state=open]:animate-menu-in data-[state=closed]:animate-menu-out";

/** Gap between the trigger and the panel, as on main. */
export const MENU_OFFSET = 12;
