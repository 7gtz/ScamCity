"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { createContext, useContext, useEffect, useId, useRef, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { activeDialog, requestDialog, subscribeDialogs } from "./dialog-manager";
import "./dialog.css";

const InsideDialog = createContext(false);

export interface CityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  dismissOnEscape?: boolean;
  dismissOnBackdrop?: boolean;
  /** Hide the generic footer close when the dialog content owns its exit control. */
  showCloseButton?: boolean;
  /** Use a task-specific exit label when "Close" would be ambiguous. */
  closeLabel?: string;
  className?: string;
}

/** One controlled modal at a time. Close the current modal before opening another. */
export function CityDialog({ open, onOpenChange, title, description, children,
  initialFocusRef, returnFocusRef, dismissOnEscape = true,
  dismissOnBackdrop = false, showCloseButton = true, closeLabel = "Close", className = "" }: CityDialogProps) {
  const nested = useContext(InsideDialog);
  const descriptionId = useId();
  const previousFocus = useRef<HTMLElement | null>(null);
  const content = useRef<HTMLDivElement>(null);
  const restoreInert = useRef<(() => void) | null>(null);
  const owner = useSyncExternalStore(subscribeDialogs, activeDialog, () => null);
  useEffect(() => {
    if (open && !nested) return requestDialog(descriptionId);
  }, [open, nested, descriptionId]);
  useEffect(() => () => { restoreInert.current?.(); }, []);
  if (nested && open) throw new Error("Close the active CityDialog before opening another dialog.");
  return <Dialog.Root open={open && owner === descriptionId} onOpenChange={onOpenChange} modal>
    <Dialog.Portal>
      <Dialog.Overlay className="city-dialog-backdrop" />
      <Dialog.Content ref={content} className={`city-dialog ${className}`} aria-describedby={description ? descriptionId : undefined}
        onOpenAutoFocus={(event) => {
          previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          const changed: HTMLElement[] = [];
          for (const sibling of document.body.children) {
            if (sibling instanceof HTMLElement && !sibling.contains(content.current) && !sibling.classList.contains("city-dialog-backdrop") && !sibling.hasAttribute("data-radix-focus-guard") && !sibling.inert) {
              sibling.inert = true;
              changed.push(sibling);
            }
          }
          restoreInert.current = () => { changed.forEach((element) => { element.inert = false; }); };
          if (initialFocusRef?.current) { event.preventDefault(); initialFocusRef.current.focus(); }
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreInert.current?.();
          restoreInert.current = null;
          const target = returnFocusRef?.current ?? previousFocus.current;
          if (target?.isConnected) target.focus();
        }}
        onEscapeKeyDown={(event) => { if (!dismissOnEscape) event.preventDefault(); }}
        onInteractOutside={(event) => { if (!dismissOnBackdrop) event.preventDefault(); }}>
        {dismissOnEscape && showCloseButton && (
          <Dialog.Close className="city-dialog-close" aria-label={closeLabel}>
            {closeLabel} <span aria-hidden="true">×</span>
          </Dialog.Close>
        )}
        <Dialog.Title className="city-dialog-title">{title}</Dialog.Title>
        {description && <Dialog.Description id={descriptionId} className="city-dialog-description">{description}</Dialog.Description>}
        <InsideDialog.Provider value={true}>{children}</InsideDialog.Provider>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

export interface DestructiveConfirmationProps extends Omit<CityDialogProps, "children" | "initialFocusRef"> {
  confirmLabel: string;
  onConfirm: () => void;
}

export function DestructiveConfirmation({ confirmLabel, onConfirm, ...props }: DestructiveConfirmationProps) {
  const cancel = useRef<HTMLButtonElement>(null);
  return <CityDialog {...props} initialFocusRef={cancel} dismissOnBackdrop={false}>
    <div className="city-dialog-actions">
      <button ref={cancel} className="city-ui-button" onClick={() => props.onOpenChange(false)}>Cancel</button>
      <button className="city-ui-button" data-destructive="true" onClick={() => { props.onOpenChange(false); onConfirm(); }}>{confirmLabel}</button>
    </div>
  </CityDialog>;
}
