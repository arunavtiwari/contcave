"use client";

import React, { useCallback, useEffect, useState } from "react";
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

  useEffect(() => {
    setShowModal(isOpen);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (disabled) {
      return;
    }

    setShowModal(false);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [disabled, onClose]);

  const handleSubmit = useCallback(() => {
    if (disabled) {
      return;
    }

    onSubmit();
  }, [onSubmit, disabled]);

  const handleSecondAction = useCallback(() => {
    if (disabled || !secondaryAction) {
      return;
    }

    secondaryAction();
  }, [disabled, secondaryAction]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="justify-center items-center flex fixed inset-0 z-[999] bg-neutral-800/70 p-2">
        <div className={`relative mx-auto h-fit ${autoWidth ? '' : 'w-full  lg:w-3/6 xl:w-2/5  md:w-4/6'} ${customWidth}`}>
          <div
            className={`translate duration-300 ${showModal ? "translate-y-0" : "translate-y-full"
              } ${showModal ? "opacity-100" : "opacity-0"}`}
          >
            <div className="translate h-fit border-0 rounded-xl shadow-lg relative flex flex-col w-full bg-white">
              {/* Header */}
              <div className="flex items-center p-4 rounded-t-xl justify-between relative border-b-[1px] bg-slate-100/40">
                <button
                  className="hover:opacity-70 transition absolute"
                  onClick={handleClose}
                >
                  <IoMdCloseCircle size={24} />
                </button>
                <div className="text-lg font-semibold w-full text-center">{title}</div>
              </div>

              {/* Body */}
              <div className="overflow-y-auto max-h-[calc(100vh-20px)]">
                <div className={`flex-auto p-4 relative ${fixedHeight ? ' overflow-y-auto ' : ''}`}>{body}</div>
                {!selfActionButton && (
                  <div className={`flex flex-col gap-2 ${!verificationBtn ? 'p-6 pt-2' : 'p-6 pt-0'}`}>
                    {
                      !selfActionButton && !verificationBtn && (
                        <div className="flex flex-row items-center gap-4 w-full">
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
                          />
                        </div>
                      )
                    }
                    {
                      verificationBtn && (
                        <div className="flex flex-row items-center gap-4 w-full">

                          <Button
                            disabled={!termsAndConditionsAccept}
                            label="Complete Listing"
                            onClick={handleSubmit}
                          />
                        </div>
                      )
                    }
                    {footer}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Modal;
