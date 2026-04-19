"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { IoMdCloseCircle } from "react-icons/io";

import Button from "@/components/ui/Button";

type Props = {
  isOpen?: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title?: string;
  body?: React.ReactElement;
  footer?: React.ReactElement;
  actionLabel: string;
  disabled?: boolean;
  customWidth?: string;
  fixedHeight?: boolean;
  selfActionButton?: boolean;
  secondaryAction?: () => void;
  secondaryActionLabel?: string;
  nestedModal?: boolean;
  isLoading?: boolean;
  disableOverlayClose?: boolean;

};

function Modal({
  isOpen,
  onClose,
  onSubmit,
  title,
  body,
  actionLabel,
  footer,
  disabled,
  secondaryAction,
  customWidth,
  selfActionButton,
  secondaryActionLabel,
  nestedModal,
  isLoading,
  bodyRef,
  customHeight,
  disableOverlayClose,
}: Props & { bodyRef?: React.RefObject<HTMLDivElement | null>; customHeight?: string }) {
  const [showModal, setShowModal] = useState(isOpen);
  const modalRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (isOpen) setShowModal(true);
    else {
      const timer = setTimeout(() => setShowModal(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);


  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (disabled) return;
    onClose();
  }, [disabled, onClose]);

  const handleSubmit = useCallback(() => {
    if (disabled) return;
    onSubmit();
  }, [onSubmit, disabled]);

  const handleSecondAction = useCallback(() => {
    if (disabled || !secondaryAction) return;
    secondaryAction();
  }, [disabled, secondaryAction]);


  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !disabled) handleClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [handleClose, disabled]);


  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (disableOverlayClose) return;
    if (e.target === e.currentTarget) handleClose();
  }, [handleClose, disableOverlayClose]);

  if (!isOpen && !showModal) return null;

  return (
    <div
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-999 flex items-center justify-center px-4 transition-all duration-500 ${nestedModal ? "bg-foreground/20" : "bg-black/60"
        } ${isOpen ? "opacity-100" : "opacity-0"} ${nestedModal ? "" : isLoading ? "backdrop-blur-md" : "backdrop-blur-[2px]"
        }`}
    >
      <div
        ref={modalRef}
        className={`relative mx-auto transform transition-all duration-500 ease-out ${showModal && isOpen
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-[0.98] translate-y-8"
          } ${customWidth || "w-full md:w-4/6 lg:w-3/6 xl:w-2/5 md:max-w-2xl"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className={`flex flex-col w-full bg-background rounded-4xl shadow-2xl shadow-black/20 ring-1 ring-border/50 overflow-hidden ${customHeight || "h-auto max-h-[90vh]"}`}>

          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 bg-background relative shrink-0">
            <h2 id="modal-title" className="text-xl font-bold tracking-tight text-foreground">
              {title}
            </h2>
            <button
              className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
              onClick={handleClose}
              aria-label="Close modal"
            >
              <IoMdCloseCircle size={24} className="opacity-80 hover:opacity-100" />
            </button>
          </div>


          <div
            ref={bodyRef}
            className="flex-1 px-8 pb-8 pt-2 overflow-y-auto text-[15px] leading-relaxed text-muted-foreground"
          >
            {body}
          </div>


          {!selfActionButton && (
            <div className="px-8 py-5 flex flex-col md:flex-row gap-3 justify-end items-center bg-muted/20 shrink-0 border-t border-border/40">
              {secondaryAction && secondaryActionLabel && (
                <Button
                  outline
                  rounded
                  classNames="border-border/60 hover:bg-background"
                  disabled={disabled}
                  label={secondaryActionLabel}
                  onClick={handleSecondAction}
                />
              )}

              <Button
                rounded
                disabled={disabled}
                label={actionLabel}
                onClick={handleSubmit}
                loading={isLoading}
              />
            </div>
          )}


          {footer && <div className="px-8 pb-6 shrink-0">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export default Modal;
