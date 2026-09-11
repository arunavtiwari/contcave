import { type NavTabItem,NavTabs } from "@/components/ui/Tabs";

export type AdminTabItem = NavTabItem;

export type AdminTabsProps = {
  activeId: string;
  ariaLabel: string;
  items: AdminTabItem[];
  className?: string;
  onSelect?: (id: string) => void;
};

export default function AdminTabs({ activeId, ariaLabel, items, className, onSelect }: AdminTabsProps) {
  return (
    <NavTabs
      activeId={activeId}
      ariaLabel={ariaLabel}
      items={items}
      className={className}
      layoutId="admin-bookings-tab"
      onSelect={onSelect}
    />
  );
}
