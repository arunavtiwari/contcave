import { type NavTabItem,NavTabs } from "@/components/ui/Tabs";

export type AdminTabItem = NavTabItem;

export type AdminTabsProps = {
  activeId: string;
  ariaLabel: string;
  items: AdminTabItem[];
  className?: string;
};

export default function AdminTabs({ activeId, ariaLabel, items, className }: AdminTabsProps) {
  return (
    <NavTabs
      activeId={activeId}
      ariaLabel={ariaLabel}
      items={items}
      className={className}
      layoutId="admin-bookings-tab"
    />
  );
}
