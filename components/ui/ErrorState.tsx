"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import React, { useState } from "react";
import { FiAlertTriangle, FiCheck, FiChevronDown, FiCopy, FiHome, FiRotateCw } from "react-icons/fi";

import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  subtitle?: string;
  error?: Error & { digest?: string };
  reset?: () => void;
  homeHref?: string;
  homeLabel?: string;
  className?: string;
}

export default function ErrorState({
  title = "Something went wrong",
  subtitle = "We encountered an unexpected issue while processing your request.",
  error,
  reset,
  homeHref = "/",
  homeLabel = "Go Home",
  className,
}: ErrorStateProps) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const digest = error?.digest;

  const handleCopyDigest = () => {
    if (!digest) return;
    navigator.clipboard.writeText(digest);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex flex-col items-center justify-center min-h-[50vh] px-4 py-12 text-center",
        className
      )}
    >
      {/* Alert Emblem */}
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive">
        <FiAlertTriangle className="h-7 w-7 stroke-[2.25]" />
      </div>

      {/* Typography */}
      <div className="max-w-md space-y-2 mb-6">
        <Heading
          center
          title={title}
          subtitle={subtitle}
          variant="h3"
        />

        {digest && (
          <div className="pt-2 flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-muted border border-border text-muted-foreground">
              <span>ID: {digest.slice(0, 12)}</span>
              <button
                type="button"
                onClick={handleCopyDigest}
                title="Copy error ID"
                className="hover:text-foreground transition-colors p-0.5"
                aria-label="Copy error ID"
              >
                {copied ? <FiCheck className="size-3 text-emerald-600" /> : <FiCopy className="size-3" />}
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {reset && (
          <Button
            label="Try Again"
            icon={FiRotateCw}
            onClick={() => reset()}
            fit
          />
        )}
        <Link href={homeHref}>
          <Button
            label={homeLabel}
            icon={FiHome}
            variant="outline"
            fit
          />
        </Link>
      </div>

      {/* Expandable Technical Details (Dev / Diagnostic) */}
      {error?.message && process.env.NODE_ENV !== "production" && (
        <div className="mt-8 max-w-lg w-full text-left">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-mono transition-colors mx-auto"
          >
            <span>{showDetails ? "Hide" : "Show"} developer diagnostic</span>
            <FiChevronDown className={cn("size-3.5 transition-transform", showDetails && "rotate-180")} />
          </button>

          {showDetails && (
            <div className="mt-2.5 p-3 rounded-xl bg-muted/60 border border-border text-xs font-mono text-foreground wrap-break-word overflow-x-auto max-h-48 leading-relaxed">
              <p className="font-semibold text-destructive mb-1">{error.name}: {error.message}</p>
              {error.stack && (
                <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap">{error.stack}</pre>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
