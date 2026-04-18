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
      className={`fixed inset-0 z-999 flex items-center justify-center px-4 transition-all duration-300 ${nestedModal ? "bg-foreground/30" : "bg-foreground/60"
        } ${isOpen ? "opacity-100" : "opacity-0"} ${nestedModal ? "" : isLoading ? "backdrop-blur-md" : "backdrop-blur-sm"
        }`}
    >
      <div
        ref={modalRef}
        className={`relative mx-auto transform transition-all duration-300 ${showModal && isOpen
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-95 translate-y-4"
          } ${customWidth || "w-full md:w-4/6 lg:w-3/6 xl:w-2/5 md:max-w-3xl"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className={`flex flex-col w-full bg-background rounded-2xl ring-1 ring-border overflow-hidden ${customHeight || "h-[85vh] max-h-[85vh]"}`}>

          <div className="flex items-center justify-center p-5 border-b border-border bg-muted/30 relative shrink-0">
            <h2 id="modal-title" className="text-lg font-semibold text-center text-foreground">
              {title}
            </h2>
            <button
              className="absolute right-6 text-muted-foreground hover:text-foreground transition focus:outline-none"
              onClick={handleClose}
              aria-label="Close modal"
            >
              <IoMdCloseCircle size={26} />
            </button>
          </div>


          <div
            ref={bodyRef}
            className="flex-1 px-6 py-5 overflow-y-auto text-foreground"
          >
            {body}
          </div>


          {!selfActionButton && (
            <div className="px-6 py-4 border-t border-border flex flex-col md:flex-row gap-3 justify-end items-center bg-muted/30 shrink-0">
              {secondaryAction && secondaryActionLabel && (
                <Button
                  outline
                  rounded
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


          {footer && <div className="px-6 pb-4 shrink-0">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export default Modal;
