"use client";

import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import type { IconType } from "react-icons";
import { FaFacebookF, FaLinkedinIn, FaWhatsapp, FaXTwitter } from "react-icons/fa6";
import { FiCheck, FiCopy, FiMail, FiShare2 } from "react-icons/fi";
import { toast } from "sonner";

import Modal from "@/components/modals/Modal";
import { cn } from "@/lib/utils";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  location: string;
  image?: string;
};

type Channel = {
  id: string;
  label: string;
  icon: IconType;
  iconClass: string;
  bgClass: string;
} & ({ href: string } | { onClick: () => void });

const COPIED_RESET_MS = 2500;

const subscribe = () => () => {};
const canShareNatively = () => typeof navigator.share === "function";

const CHANNEL_CLASS =
  "flex items-center gap-2.5 rounded-xl border border-border/70 p-3 text-left transition-all cursor-pointer hover:border-border active:scale-[0.98]";

export default function ShareModal({ isOpen, onClose, url, title, location, image }: Props) {
  const [copied, setCopied] = useState(false);
  const hasNativeShare = useSyncExternalStore(subscribe, canShareNatively, () => false);

  const message = `Check out ${title} on ContCave`;
  const encodedUrl = encodeURIComponent(url);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const shareNatively = async () => {
    try {
      await navigator.share({ title, text: message, url });
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== "AbortError") toast.error("Failed to open share menu");
    }
  };

  const channels: Channel[] = [
    {
      id: "copy",
      label: copied ? "Copied!" : "Copy link",
      icon: copied ? FiCheck : FiCopy,
      iconClass: copied ? "text-emerald-500" : "text-foreground",
      bgClass: "hover:bg-muted/80",
      onClick: copyLink,
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: FaWhatsapp,
      iconClass: "text-[#25D366]",
      bgClass: "hover:bg-emerald-500/10",
      href: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${message}: ${url}`)}`,
    },
    ...(hasNativeShare
      ? [{
        id: "native",
        label: "More options",
        icon: FiShare2,
        iconClass: "text-foreground",
        bgClass: "hover:bg-muted/80",
        onClick: shareNatively,
      }]
      : []),
    {
      id: "email",
      label: "Email",
      icon: FiMail,
      iconClass: "text-sky-500",
      bgClass: "hover:bg-sky-500/10",
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Check out this creative studio on ContCave:\n\n${title}\n${location}\n${url}`)}`,
    },
    {
      id: "twitter",
      label: "X (Twitter)",
      icon: FaXTwitter,
      iconClass: "text-foreground",
      bgClass: "hover:bg-muted/80",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodedUrl}`,
    },
    {
      id: "facebook",
      label: "Facebook",
      icon: FaFacebookF,
      iconClass: "text-[#1877F2]",
      bgClass: "hover:bg-blue-500/10",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      icon: FaLinkedinIn,
      iconClass: "text-[#0A66C2]",
      bgClass: "hover:bg-blue-500/10",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
  ];

  const body = (
    <div className="flex flex-col gap-5 pt-1">
      <div className="flex items-center gap-3.5 rounded-2xl border border-border/80 bg-muted/30 p-3">
        {image && (
          <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted border border-border/50">
            <Image src={image} alt={title} fill sizes="56px" className="object-cover" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          <p className="truncate text-xs text-muted-foreground mt-0.5">{location}</p>
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Share to
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {channels.map((channel) => {
            const content = (
              <>
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background border border-border/60">
                  <channel.icon className={cn("size-4 transition-transform", channel.iconClass)} />
                </div>
                <span className="truncate text-xs font-medium text-foreground">{channel.label}</span>
              </>
            );
            return "href" in channel ? (
              <a
                key={channel.id}
                href={channel.href}
                {...(channel.href.startsWith("http") && { target: "_blank", rel: "noopener noreferrer" })}
                className={cn(CHANNEL_CLASS, channel.bgClass)}
              >
                {content}
              </a>
            ) : (
              <button key={channel.id} type="button" onClick={channel.onClick} className={cn(CHANNEL_CLASS, channel.bgClass)}>
                {content}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onCloseAction={onClose}
      title="Share this space"
      body={body}
      customWidth="w-full max-w-lg"
    />
  );
}
