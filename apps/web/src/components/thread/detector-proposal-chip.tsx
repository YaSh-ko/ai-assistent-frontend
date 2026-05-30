import { motion, AnimatePresence } from "framer-motion";
import { Target, ListChecks, Eye, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DetectorProposal } from "@/lib/detector-types";
import { DETECTOR_ENTITY_LABELS } from "@/lib/detector-types";

const TYPE_ICONS = {
  observation: Eye,
  goal: Target,
  task: ListChecks,
} as const;

type Props = {
  proposal: DetectorProposal | null;
  isSaving?: boolean;
  onConfirm: () => void;
  onDecline: () => void;
  className?: string;
};

export function DetectorProposalChip({
  proposal,
  isSaving = false,
  onConfirm,
  onDecline,
  className,
}: Props) {
  const entityType = proposal?.entity_type ?? "observation";
  const Icon = TYPE_ICONS[entityType as keyof typeof TYPE_ICONS] ?? Eye;
  const label = DETECTOR_ENTITY_LABELS[entityType] ?? entityType;
  const title = proposal?.preview?.title ?? "Без названия";
  const description =
    (proposal?.preview?.description as string | undefined) ||
    (proposal?.preview?.hypothesis as string | undefined);

  const isUpdate = proposal?.action === "confirm_update";
  const existingTitle = proposal?.existing_title;

  const chipMessage = isUpdate
    ? entityType === "observation"
      ? `Добавить дополнение к «${existingTitle ?? title}»?`
      : `Обновить ${label} «${existingTitle ?? title}»?`
    : proposal?.revived
      ? `Вернулись к теме — сохранить ${label}?`
      : `Похоже, можно сохранить ${label}`;

  const confirmLabel = isUpdate
    ? entityType === "observation"
      ? "Добавить"
      : "Обновить"
    : "Сохранить";
  const savingLabel = isUpdate
    ? entityType === "observation"
      ? "Добавляем…"
      : "Обновляем…"
    : "Сохраняем…";

  const borderColor = isUpdate ? "border-amber-500/25" : "border-emerald-500/25";
  const iconBg = isUpdate ? "bg-amber-500/15 border-amber-500/25" : "bg-emerald-500/15 border-emerald-500/25";
  const iconColor = isUpdate ? "text-amber-400" : "text-emerald-400";
  const btnBg = isUpdate ? "bg-amber-500 hover:bg-amber-400" : "bg-emerald-500 hover:bg-emerald-400";

  const ChipIcon = isUpdate ? RefreshCw : Icon;

  return (
    <AnimatePresence>
      {proposal?.show_chip && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "relative z-20 mx-auto w-full max-w-3xl rounded-2xl border",
            borderColor,
            "bg-zinc-900/95 backdrop-blur-md shadow-xl px-4 py-3 sm:px-5 sm:py-4",
            className,
          )}
          role="region"
          aria-label={isUpdate ? "Предложение обновить данные" : "Предложение сохранить данные"}
        >
          <div className="flex gap-3">
            <div className={cn("flex-shrink-0 flex items-center justify-center size-10 rounded-xl border", iconBg)}>
              <ChipIcon className={cn("size-5", iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/70">
                {chipMessage}
                {proposal.confidence > 0 && (
                  <span className="text-white/40 ml-1">
                    ({Math.round(proposal.confidence * 100)}%)
                  </span>
                )}
              </p>
              <p className="text-base font-medium text-white mt-0.5 truncate">{title}</p>
              {description && description !== title && (
                <p className="text-sm text-white/55 mt-1 line-clamp-2">{description}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  type="button"
                  size="sm"
                  disabled={isSaving}
                  className={cn(btnBg, "relative z-10 min-h-9 px-4 text-zinc-950 rounded-xl pointer-events-auto")}
                  onClick={onConfirm}
                >
                  {isSaving ? savingLabel : confirmLabel}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isSaving}
                  className="relative z-10 min-h-9 px-4 text-white/70 hover:text-white hover:bg-white/10 rounded-xl pointer-events-auto"
                  onClick={onDecline}
                >
                  Не сейчас
                </Button>
              </div>
            </div>
            <button
              type="button"
              onClick={onDecline}
              className="flex-shrink-0 text-white/40 hover:text-white/80 p-1"
              aria-label="Закрыть"
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
