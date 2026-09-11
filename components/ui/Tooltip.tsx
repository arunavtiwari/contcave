"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------------------------------
 * Context & Provider
 * -----------------------------------------------------------------------------------------------*/

type TooltipContextValue = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentId: string;
  delayDuration: number;
};

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

function useTooltipContext() {
  const context = React.useContext(TooltipContext);
  if (!context) {
    throw new Error("Tooltip compound components must be used within <Tooltip>");
  }
  return context;
}

type TooltipProviderProps = {
  delayDuration?: number;
  children: React.ReactNode;
};

const TooltipProviderContext = React.createContext<{ delayDuration: number }>({
  delayDuration: 150,
});

export function TooltipProvider({
  delayDuration = 150,
  children,
}: TooltipProviderProps) {
  return (
    <TooltipProviderContext.Provider value={{ delayDuration }}>
      {children}
    </TooltipProviderContext.Provider>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Tooltip Root
 * -----------------------------------------------------------------------------------------------*/

type TooltipSide = "top" | "bottom" | "left" | "right";
type TooltipAlign = "start" | "center" | "end";

export type TooltipProps = {
  children: React.ReactNode;
  content?: React.ReactNode;
  side?: TooltipSide;
  align?: TooltipAlign;
  sideOffset?: number;
  delayDuration?: number;
  className?: string;
  disabled?: boolean;
};

export function Tooltip({
  children,
  content,
  side = "top",
  align = "center",
  sideOffset = 6,
  delayDuration,
  className,
  disabled = false,
}: TooltipProps) {
  const provider = React.useContext(TooltipProviderContext);
  const resolvedDelay = delayDuration ?? provider.delayDuration;

  const [isOpen, setIsOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentId = React.useId();

  // If simple usage with `content` prop:
  if (content !== undefined) {
    if (disabled || !content) {
      return <>{children}</>;
    }

    return (
      <TooltipContext.Provider
        value={{
          isOpen,
          setIsOpen,
          triggerRef,
          contentId,
          delayDuration: resolvedDelay,
        }}
      >
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          sideOffset={sideOffset}
          className={className}
        >
          {content}
        </TooltipContent>
      </TooltipContext.Provider>
    );
  }

  // Compound usage
  return (
    <TooltipContext.Provider
      value={{
        isOpen,
        setIsOpen,
        triggerRef,
        contentId,
        delayDuration: resolvedDelay,
      }}
    >
      {children}
    </TooltipContext.Provider>
  );
}

/* -------------------------------------------------------------------------------------------------
 * Tooltip Trigger
 * -----------------------------------------------------------------------------------------------*/

export type TooltipTriggerProps = React.HTMLAttributes<HTMLElement> & {
  asChild?: boolean;
  children: React.ReactNode;
};

export const TooltipTrigger = React.forwardRef<HTMLElement, TooltipTriggerProps>(
  function TooltipTrigger({ asChild, children, ...props }, ref) {
    const { isOpen, setIsOpen, triggerRef, contentId, delayDuration } =
      useTooltipContext();
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsOpen(true);
      }, delayDuration);
    };

    const handleMouseLeave = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsOpen(false);
    };

    const handleFocus = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsOpen(true);
    };

    const handleBlur = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsOpen(false);
      }
    };

    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }, []);

    const mergedRef = (node: HTMLElement | null) => {
      triggerRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLElement | null>).current = node;
      }
    };

    if (asChild && React.isValidElement(children)) {
      const childProps = (children.props ?? {}) as Record<string, unknown>;
      return React.cloneElement(
        children as React.ReactElement<Record<string, unknown>>,
        {
          ref: mergedRef,
          "aria-describedby": isOpen ? contentId : undefined,
          onMouseEnter: (e: React.MouseEvent) => {
            handleMouseEnter();
            if (typeof childProps.onMouseEnter === "function") {
              childProps.onMouseEnter(e);
            }
          },
          onMouseLeave: (e: React.MouseEvent) => {
            handleMouseLeave();
            if (typeof childProps.onMouseLeave === "function") {
              childProps.onMouseLeave(e);
            }
          },
          onFocus: (e: React.FocusEvent) => {
            handleFocus();
            if (typeof childProps.onFocus === "function") {
              childProps.onFocus(e);
            }
          },
          onBlur: (e: React.FocusEvent) => {
            handleBlur();
            if (typeof childProps.onBlur === "function") {
              childProps.onBlur(e);
            }
          },
          onKeyDown: (e: React.KeyboardEvent) => {
            handleKeyDown(e);
            if (typeof childProps.onKeyDown === "function") {
              childProps.onKeyDown(e);
            }
          },
          ...props,
        }
      );
    }

    return (
      <span
        ref={mergedRef as React.Ref<HTMLSpanElement>}
        aria-describedby={isOpen ? contentId : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="inline-flex"
        {...props}
      >
        {children}
      </span>
    );
  }
);

/* -------------------------------------------------------------------------------------------------
 * Tooltip Content
 * -----------------------------------------------------------------------------------------------*/

export type TooltipContentProps = React.HTMLAttributes<HTMLDivElement> & {
  side?: TooltipSide;
  align?: TooltipAlign;
  sideOffset?: number;
};

export const TooltipContent = React.forwardRef<
  HTMLDivElement,
  TooltipContentProps
>(function TooltipContent(
  {
    children,
    side = "top",
    align = "center",
    sideOffset = 6,
    className,
    ...props
  },
  ref
) {
  const { isOpen, triggerRef, contentId } = useTooltipContext();
  const [mounted, setMounted] = React.useState(false);
  const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(
    null
  );
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = React.useCallback(() => {
    const triggerEl = triggerRef.current;
    const contentEl = contentRef.current;
    if (!triggerEl || !contentEl) return;

    const triggerRect = triggerEl.getBoundingClientRect();
    const contentRect = contentEl.getBoundingClientRect();

    let top = 0;
    let left = 0;

    // Calculate vertical alignment
    if (side === "top") {
      top = triggerRect.top - contentRect.height - sideOffset;
    } else if (side === "bottom") {
      top = triggerRect.bottom + sideOffset;
    } else {
      // side is left or right
      if (align === "start") {
        top = triggerRect.top;
      } else if (align === "end") {
        top = triggerRect.bottom - contentRect.height;
      } else {
        top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
      }
    }

    // Calculate horizontal alignment
    if (side === "left") {
      left = triggerRect.left - contentRect.width - sideOffset;
    } else if (side === "right") {
      left = triggerRect.right + sideOffset;
    } else {
      // side is top or bottom
      if (align === "start") {
        left = triggerRect.left;
      } else if (align === "end") {
        left = triggerRect.right - contentRect.width;
      } else {
        left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
      }
    }

    // Viewport bounds clamping
    const padding = 8;
    const maxLeft = window.innerWidth - contentRect.width - padding;
    const maxTop = window.innerHeight - contentRect.height - padding;

    left = Math.max(padding, Math.min(left, maxLeft));
    top = Math.max(padding, Math.min(top, maxTop));

    setCoords({ top, left });
  }, [align, side, sideOffset, triggerRef]);

  React.useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    } else {
      setCoords(null);
    }
  }, [isOpen, updatePosition]);

  if (!mounted || !isOpen) return null;

  const mergedRef = (node: HTMLDivElement | null) => {
    contentRef.current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  };

  return createPortal(
    <div
      ref={mergedRef}
      id={contentId}
      role="tooltip"
      style={{
        position: "fixed",
        top: coords ? `${coords.top}px` : "-9999px",
        left: coords ? `${coords.left}px` : "-9999px",
        opacity: coords ? 1 : 0,
      }}
      className={cn(
        "z-100 pointer-events-none select-none overflow-hidden rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-neutral-50 shadow-md border border-neutral-800 transition-opacity duration-150 animate-in fade-in-0 zoom-in-95 dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-200",
        className
      )}
      {...props}
    >
      {children}
    </div>,
    document.body
  );
});

export default Tooltip;
