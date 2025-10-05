"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { IoMdCloseCircle } from "react-icons/io";
import Button from "../Button";

type Props = {
  isOpen?: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title?: string;
  body?: React.ReactElement;
  footer?: React.ReactElement;
  actionLabel: string;
  disabled?: boolean;
  autoWidth?: boolean;
  customWidth?: string;
  fixedHeight?: boolean;
  selfActionButton?: boolean;
  verificationBtn?: boolean;
  secondaryAction?: () => void;
  secondaryActionLabel?: string;
  termsAndConditionsAccept?: boolean;
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
  autoWidth,
  customWidth,
  fixedHeight,
  selfActionButton,
  secondaryActionLabel,
  termsAndConditionsAccept
}: Props) {
  const [showModal, setShowModal] = useState(isOpen);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShowModal(isOpen);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (disabled) return;

    setShowModal(false);
    setTimeout(() => {
      onClose();
    }, 300);
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

  // Click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`relative mx-auto h-fit transform transition-all duration-300 ${
          autoWidth ? "" : "w-full md:w-4/6 lg:w-3/6 xl:w-2/5"
        } ${customWidth} ${showModal ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex flex-col w-full bg-white rounded-xl shadow-lg overflow-hidden max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-center p-4 border-b border-gray-200 relative bg-gray-50">
            <h2 id="modal-title" className="text-lg font-semibold text-center w-full">
              {title}
            </h2>
            <button
              className="absolute top-3 right-3 text-gray-600 hover:text-gray-800 transition"
              onClick={handleClose}
              aria-label="Close modal"
            >
              <IoMdCloseCircle size={24} />
            </button>
          </div>

          {/* Body */}
          <div className={`px-4 py-3 overflow-y-auto ${fixedHeight ? "max-h-[60vh]" : ""}`}>
            {body}
          </div>

          {/* Footer */}
          {!selfActionButton && (
            <div className={`px-6 py-4 border-t border-gray-200 flex flex-col md:flex-row gap-3 justify-end items-center`}>
              {/* Secondary Action */}
              {secondaryAction && secondaryActionLabel && (
                <Button
                  outline
                  rounded
                  disabled={disabled}
                  label={secondaryActionLabel}
                  onClick={handleSecondAction}
                />
              )}

              {/* Primary Action */}
              <Button
                rounded
                disabled={verificationBtn ? !termsAndConditionsAccept : disabled}
                label={verificationBtn ? "Complete Listing" : actionLabel}
                onClick={handleSubmit}
              />
            </div>
          )}
          {footer}
        </div>
      </div>
    </div>
  );
}

export default Modal;
