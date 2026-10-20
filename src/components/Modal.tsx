import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: ReactNode;
  drawer?: boolean;
}

export function Modal({
  title,
  eyebrow,
  onClose,
  children,
  drawer = false,
}: ModalProps) {
  const reference = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = reference.current;
    dialog?.showModal();
    dialog
      ?.querySelector<HTMLInputElement>('input:not([type="hidden"])')
      ?.focus();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={reference}
      className={`modal ${drawer ? "library-drawer" : ""}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-content">
        <header className="modal-header">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="关闭窗口"
          >
            <X size={21} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
