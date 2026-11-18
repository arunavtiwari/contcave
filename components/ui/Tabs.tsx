"use client";

import * as Radix from "@radix-ui/react-tabs";
import * as React from "react";

import { type TabIcon, tabItemClass, tabListClass, TabPill } from "@/components/ui/TabPill";
import { cn } from "@/lib/utils";

type TabsState = { value: string; layoutId: string };

const TabsStateContext = React.createContext<TabsState | null>(null);

function useTabsState() {
  const state = React.useContext(TabsStateContext);
  if (!state) throw new Error("Tabs parts must be used inside <Tabs>");
  return state;
}

export interface TabsProps extends Omit<React.ComponentPropsWithoutRef<typeof Radix.Root>, "value" | "defaultValue" | "onValueChange"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  layoutId?: string;
}

/** Accessible tabs (Radix: arrow keys, Home/End, ARIA tabs pattern) with the sliding pill. */
export function Tabs({ value, defaultValue = "", onValueChange, layoutId, className, ...props }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const activeValue = value ?? internalValue;
  const generatedId = React.useId();

  const handleChange = (next: string) => {
    if (value === undefined) setInternalValue(next);
    onValueChange?.(next);
  };

  return (
    <TabsStateContext.Provider value={{ value: activeValue, layoutId: layoutId ?? `tabs-${generatedId}` }}>
      <Radix.Root
        value={activeValue}
        onValueChange={handleChange}
        className={cn("flex w-fit max-w-full flex-col items-start gap-4", className)}
        {...props}
      />
    </TabsStateContext.Provider>
  );
}

export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof Radix.List>) {
  return <Radix.List className={cn(tabListClass, "text-muted-foreground", className)} {...props} />;
}

export interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof Radix.Trigger> {
  count?: number;
  icon?: TabIcon;
}

export function TabsTrigger({ value, count, icon, className, children, ...props }: TabsTriggerProps) {
  const { value: activeValue, layoutId } = useTabsState();
  const isActive = activeValue === value;
  return (
    <Radix.Trigger value={value} className={cn(tabItemClass(isActive), className)} {...props}>
      <TabPill isActive={isActive} layoutId={layoutId} icon={icon} count={count}>
        {children}
      </TabPill>
    </Radix.Trigger>
  );
}

export interface TabsContentProps extends Omit<React.ComponentPropsWithoutRef<typeof Radix.Content>, "forceMount"> {
  /** Keep inactive panels in the HTML (hidden), e.g. so crawlers can follow every panel's links. */
  keepMounted?: boolean;
}

export function TabsContent({ keepMounted = false, className, ...props }: TabsContentProps) {
  return (
    <Radix.Content
      forceMount={keepMounted ? true : undefined}
      className={cn("focus-visible:outline-none data-[state=active]:animate-menu-in data-[state=inactive]:hidden", className)}
      {...props}
    />
  );
}
