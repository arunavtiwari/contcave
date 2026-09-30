"use client";
import { useEffect, useState } from "react";

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
      className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition-opacity duration-300 hover:opacity-90 animate-in fade-in slide-in-from-bottom-2"
    >
      <span className="mt-1.5 h-3 w-3 rotate-45 border-l-2 border-t-2 border-background" />
    </button>
  );
}
