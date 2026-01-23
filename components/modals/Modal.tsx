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
  verificationBtn?: boolean;
  secondaryAction?: () => void;
  secondaryActionLabel?: string;
  termsAndConditionsAccept?: boolean;
  isLoading?: boolean;

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
  verificationBtn,
  customWidth,
  selfActionButton,
  secondaryActionLabel,
  termsAndConditionsAccept,
  isLoading,
  bodyRef, // New prop for scrolling
}: Props & { bodyRef?: React.RefObject<HTMLDivElement | null> }) {
  const [showModal, setShowModal] = useState(isOpen);
  const modalRef = useRef<HTMLDivElement>(null);

  // Smooth transition open/close
  useEffect(() => {
    if (isOpen) setShowModal(true);
    else {
      const timer = setTimeout(() => setShowModal(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Scroll lock while modal open
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

  // Close on Esc key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !disabled) handleClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [handleClose, disabled]);

  // Close when clicking backdrop (not inner content)
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) handleClose();
  };

  if (!isOpen && !showModal) return null;

  return (
    <div
      className={`fixed inset-0 z-999 flex items-center justify-center bg-black/60 px-4 transition-all duration-300 ${isOpen ? "opacity-100" : "opacity-0"
        } ${isLoading ? "backdrop-blur-md" : "backdrop-blur-sm"}`}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`relative mx-auto transform transition-all duration-300 ${showModal && isOpen
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-95 translate-y-4"
          } ${customWidth || "w-full md:w-4/6 lg:w-3/6 xl:w-2/5"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex flex-col w-full bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden h-[85vh] max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-center p-5 border-b border-gray-200 bg-gray-50 relative shrink-0">
            <h2 id="modal-title" className="text-lg font-semibold text-center text-gray-900">
              {title}
            </h2>
            <button
              className="absolute right-6 text-gray-500 hover:text-gray-800 transition focus:outline-none"
              onClick={handleClose}
              aria-label="Close modal"
            >
              <IoMdCloseCircle size={26} />
            </button>
          </div>

          {/* Body */}
          <div
            ref={bodyRef}
            className="flex-1 px-6 py-5 overflow-y-auto text-gray-800"
          >
            {body}
          </div>

          {/* Footer */}
          {!selfActionButton && (
            <div className="px-6 py-4 border-t border-gray-200 flex flex-col md:flex-row gap-3 justify-end items-center bg-gray-50 shrink-0">
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
                disabled={verificationBtn ? !termsAndConditionsAccept || disabled : disabled}
                label={verificationBtn ? "Complete Listing" : actionLabel}
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
