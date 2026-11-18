"use client";

import type React from "react";
import { IoMdCloseCircle } from "react-icons/io";

import Button from "@/components/ui/Button";
import Dialog, { DialogTitle } from "@/components/ui/Dialog";
import Heading from "@/components/ui/Heading";
import { cn } from "@/lib/utils";

type Props = {
  isOpen?: boolean;
  onCloseAction: () => void;
  onSubmitAction?: () => void;
  title?: string;
  body?: React.ReactElement;
  footer?: React.ReactElement;
  actionLabel?: string;
  disabled?: boolean;
  customWidth?: string;
  customHeight?: string;
  secondaryActionAction?: () => void;
  secondaryActionLabel?: string;
  nestedModal?: boolean;
  isLoading?: boolean;
  primaryActionVariant?: "default" | "outline" | "success" | "destructive" | "ghost" | "secondary";
  actionDisabled?: boolean;
  testId?: string;
  bodyRef?: React.RefObject<HTMLDivElement | null>;
};

/**
 * The app's dialog (Radix: focus trap, focus return, Escape, scroll lock, stacking). It never
 * closes on an outside click, and Escape and the close button do nothing while `disabled`.
 */
function Modal({
  isOpen = false,
  onCloseAction,
  onSubmitAction,
  title,
  body,
  footer,
  actionLabel = "",
  disabled,
  customWidth,
  customHeight,
  secondaryActionAction,
  secondaryActionLabel,
  nestedModal,
  isLoading,
  primaryActionVariant = "default",
  actionDisabled,
  testId,
  bodyRef,
}: Props) {
  const close = () => {
    if (!disabled) onCloseAction();
  };
  const hasPrimary = Boolean(actionLabel);
  const hasSecondary = Boolean(secondaryActionAction && secondaryActionLabel);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && close()}
      modalOnly
      data-testid={testId}
      overlayClassName={cn(
        nestedModal ? "bg-foreground/20 backdrop-blur-sm" : "bg-foreground/60",
        !nestedModal && isLoading && "backdrop-blur-md"
      )}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-background",
        "w-[calc(100%-2rem)]",
        customWidth || "md:w-4/6 md:max-w-2xl lg:w-3/6 xl:w-2/5",
        customHeight || "h-auto max-h-[90vh]"
      )}
    >
            <div className="relative flex shrink-0 items-center justify-between bg-background p-5">
              <DialogTitle asChild>
                <div>
                  <Heading title={title} variant="h5" as="h2" />
                </div>
              </DialogTitle>
              <Button
                onClick={close}
                icon={IoMdCloseCircle}
                variant="ghost"
                rounded
                size="lg"
                aria-label="Close dialog"
                className="h-fit! w-fit! p-0! opacity-80 hover:opacity-100"
              />
            </div>

            <div ref={bodyRef} className="flex-1 overflow-y-auto px-5 pb-5 pt-2">
              {body}
            </div>

            {(hasSecondary || hasPrimary) && (
              <div className="flex shrink-0 flex-col items-center justify-end gap-3 border-t border-border/40 bg-muted/10 px-5 py-4 md:flex-row">
                {hasSecondary && (
                  <Button
                    outline
                    disabled={disabled}
                    label={secondaryActionLabel}
                    onClick={() => !disabled && secondaryActionAction?.()}
                    rounded
                    data-testid={testId ? `${testId}-secondary-action` : undefined}
                  />
                )}
                {hasPrimary && (
                  <Button
                    disabled={disabled || actionDisabled}
                    label={actionLabel}
                    onClick={() => !disabled && onSubmitAction?.()}
                    loading={isLoading}
                    variant={primaryActionVariant}
                    rounded
                    data-testid={testId ? `${testId}-primary-action` : undefined}
                  />
                )}
              </div>
            )}

      {footer && <div className="shrink-0 px-6 pb-6">{footer}</div>}
    </Dialog>
  );
}

export default Modal;
