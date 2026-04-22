"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { IoMdCloseCircle } from "react-icons/io";

import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";

type Props = {
  isOpen?: boolean;
  onCloseAction: () => void;
  onSubmitAction: () => void;
  title?: string;
  body?: React.ReactElement;
  footer?: React.ReactElement;
  actionLabel: string;
  disabled?: boolean;
  customWidth?: string;
  fixedHeight?: boolean;
  selfActionButton?: boolean;
  secondaryActionAction?: () => void;
  secondaryActionLabel?: string;
  nestedModal?: boolean;
  isLoading?: boolean;
  disableOverlayClose?: boolean;
  primaryActionVariant?: "default" | "outline" | "success" | "destructive" | "ghost" | "secondary";
  actionDisabled?: boolean;
};

function Modal({
  isOpen,
  onCloseAction,
  onSubmitAction,
  title,
  body,
  actionLabel,
  footer,
  disabled,
  secondaryActionAction,
  customWidth,
  selfActionButton,
  secondaryActionLabel,
  nestedModal,
  isLoading,
  bodyRef,
  customHeight,
  disableOverlayClose,
  primaryActionVariant = "default",
  actionDisabled,
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
    onCloseAction();
  }, [disabled, onCloseAction]);

  const handleSubmit = useCallback(() => {
    if (disabled) return;
    onSubmitAction();
  }, [onSubmitAction, disabled]);

  const handleSecondAction = useCallback(() => {
    if (disabled || !secondaryActionAction) return;
    secondaryActionAction();
  }, [disabled, secondaryActionAction]);


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
      className={`fixed inset-0 z-999 flex items-center justify-center backdrop-blur-sm px-4 transition-all duration-500 ${nestedModal ? "bg-foreground/20" : "bg-foreground/60"
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
        <div className={`flex flex-col w-full bg-background rounded-2xl shadow-md overflow-hidden ${customHeight || "h-auto max-h-[90vh]"}`}>

          {/* Header */}
          <div className="flex items-center justify-between p-5 bg-background relative shrink-0">
            <Heading
              id="modal-title"
              title={title}
              variant="h5"
              as="h2"
            />
            <Button
              onClick={handleClose}
              icon={IoMdCloseCircle}
              variant="ghost"
              rounded
              size="sm"
              classNames="opacity-80 hover:opacity-100 p-0"
            />
          </div>


          <div
            ref={bodyRef}
            className="flex-1 px-6 pb-6 pt-2 overflow-y-auto text-[15px] leading-relaxed text-muted-foreground"
          >
            {body}
          </div>


          {!selfActionButton && (
            <div className="px-6 py-4 flex flex-col md:flex-row gap-3 justify-end items-center bg-muted/10 shrink-0 border-t border-border/40">
              {secondaryActionAction && secondaryActionLabel && (
                <Button
                  outline
                  disabled={disabled}
                  label={secondaryActionLabel}
                  onClick={handleSecondAction}
                  rounded
                />
              )}

              <Button
                disabled={disabled || actionDisabled}
                label={actionLabel}
                onClick={handleSubmit}
                loading={isLoading}
                variant={primaryActionVariant}
                rounded
              />
            </div>
          )}


          {footer && <div className="px-6 pb-6 shrink-0">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export default Modal;
