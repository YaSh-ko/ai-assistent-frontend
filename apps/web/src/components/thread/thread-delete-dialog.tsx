import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThreadDeleteDialog({
  open,
  isDeleting,
  onConfirm,
  onClose,
}: Readonly<{
  open: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handler = () => onClose();
    el.addEventListener("cancel", handler);
    return () => el.removeEventListener("cancel", handler);
  }, [onClose]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handleClick = (e: MouseEvent) => {
      if (e.target === el) onClose();
    };
    el.addEventListener("click", handleClick);
    return () => el.removeEventListener("click", handleClick);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      tabIndex={-1}
      className="fixed m-auto bg-transparent p-0 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl p-6 w-[320px] shadow-2xl flex flex-col gap-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center justify-center size-12 rounded-full bg-red-500/15 border border-red-500/30">
            <AlertTriangle className="size-6 text-red-400" />
          </div>
          <div>
            <p className="text-white font-medium text-base">Удалить чат?</p>
            <p className="text-white/50 text-sm mt-1">Это действие необратимо.</p>
          </div>
        </div>
        <div className="flex gap-2 mt-1">
          <Button
            variant="ghost"
            className="flex-1 text-white/70 hover:text-white hover:bg-white/10 border border-white/15"
            onClick={onClose}
            disabled={isDeleting}
          >
            Отмена
          </Button>
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700 text-white border-none"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Удаление…" : "Удалить"}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
