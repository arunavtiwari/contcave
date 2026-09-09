"use client";

import { AnimatePresence, type HTMLMotionProps, motion } from "framer-motion";
import Link from "next/link";
import * as React from "react";

import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (val: string) => void;
  layoutId: string;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error("Tabs compound components must be used within a <Tabs> parent");
  }
  return ctx;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  layoutId?: string;
  children: React.ReactNode;
}

export function Tabs({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  layoutId,
  className,
  children,
  ...props
}: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const activeValue = isControlled ? controlledValue : internalValue;

  const instanceLayoutId = React.useId();
  const effectiveLayoutId = layoutId || `tabs-indicator-${instanceLayoutId}`;

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (!isControlled) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    },
    [isControlled, onValueChange]
  );

  return (
    <TabsContext.Provider
      value={{
        value: activeValue,
        onValueChange: handleValueChange,
        layoutId: effectiveLayoutId,
      }}
    >
      <div className={cn("flex flex-col gap-4", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="tablist"
        className={cn(
          "inline-flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/40 p-1 text-muted-foreground",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabsList.displayName = "TabsList";

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  children: React.ReactNode;
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, count, icon: Icon, className, children, disabled, ...props }, ref) => {
    const { value: activeValue, onValueChange, layoutId } = useTabsContext();
    const isActive = activeValue === value;

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isActive}
        disabled={disabled}
        onClick={() => onValueChange(value)}
        className={cn(
          "relative inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          isActive ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground",
          className
        )}
        {...props}
      >
        {isActive && (
          <motion.div
            layoutId={layoutId}
            className="absolute inset-0 rounded-lg border border-border/80 bg-background"
            transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
          />
        )}
        <span className="relative z-10 inline-flex items-center gap-1.5">
          {Icon && <Icon size={14} className="shrink-0" />}
          <span>{children}</span>
          {typeof count === "number" && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-semibold transition-colors",
                isActive
                  ? "bg-muted text-foreground"
                  : "bg-background/80 text-muted-foreground"
              )}
            >
              {count}
            </span>
          )}
        </span>
      </button>
    );
  }
);
TabsTrigger.displayName = "TabsTrigger";

export interface TabsContentProps extends HTMLMotionProps<"div"> {
  value: string;
  children: React.ReactNode;
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, className, children, ...props }, ref) => {
    const { value: activeValue } = useTabsContext();
    const isSelected = activeValue === value;

    return (
      <AnimatePresence mode="wait">
        {isSelected && (
          <motion.div
            key={value}
            ref={ref}
            role="tabpanel"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className={cn("focus-visible:outline-none", className)}
            {...props}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);
TabsContent.displayName = "TabsContent";

export interface NavTabItem {
  id: string;
  label: string;
  count?: number;
  href: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;
}

export interface NavTabsProps extends React.HTMLAttributes<HTMLElement> {
  activeId: string;
  items: NavTabItem[];
  ariaLabel?: string;
  layoutId?: string;
}

export function NavTabs({
  activeId,
  items,
  ariaLabel = "Navigation tabs",
  layoutId,
  className,
  ...props
}: NavTabsProps) {
  const instanceLayoutId = React.useId();
  const effectiveLayoutId = layoutId || `nav-tabs-indicator-${instanceLayoutId}`;

  return (
    <nav
      className={cn(
        "inline-flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/40 p-1 select-none",
        className
      )}
      aria-label={ariaLabel}
      {...props}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        const Icon = item.icon;

        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              isActive ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <motion.div
                layoutId={effectiveLayoutId}
                className="absolute inset-0 rounded-lg border border-border/80 bg-background"
                transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {Icon && <Icon size={14} className="shrink-0" />}
              <span>{item.label}</span>
              {typeof item.count === "number" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-semibold transition-colors",
                    isActive
                      ? "bg-muted text-foreground"
                      : "bg-background/80 text-muted-foreground"
                  )}
                >
                  {item.count}
                </span>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default Tabs;
