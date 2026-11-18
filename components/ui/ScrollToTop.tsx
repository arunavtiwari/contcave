"use client";

import { useEffect, useState } from "react";
import { FiArrowUp } from "react-icons/fi";

import { floatingButton } from "@/components/ui/floatingButton";
import { cn } from "@/lib/utils";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => setIsVisible(window.scrollY > 300);
    toggleVisibility();
    window.addEventListener("scroll", toggleVisibility, { passive: true });
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      className={cn(floatingButton(), "animate-menu-in")}
    >
      <FiArrowUp aria-hidden="true" className="size-5" />
    </button>
  );
}
