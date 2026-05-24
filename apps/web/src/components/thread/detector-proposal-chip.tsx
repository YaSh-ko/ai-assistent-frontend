import { motion, AnimatePresence } from "framer-motion";
import { Target, FlaskConical, BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DetectorProposal } from "@/lib/detector-types";
import { DETECTOR_ENTITY_LABELS } from "@/lib/detector-types";

const TYPE_ICONS = {
  event: BookOpen,
  goal: Target,
  experiment: FlaskConical,
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
  const entityType = proposal?.entity_type ?? "event";
  const Icon = TYPE_ICONS[entityType as keyof typeof TYPE_ICONS] ?? BookOpen;
  const label = DETECTOR_ENTITY_LABELS[entityType] ?? entityType;
  const title = proposal?.preview?.title ?? "Без названия";
  const description =
    (proposal?.preview?.description as string | undefined) ||
    (proposal?.preview?.hypothesis as string | undefined);

  return (
    <AnimatePresence>
      {proposal?.show_chip && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "mx-auto w-full max-w-3xl rounded-2xl border border-indigo-400/30",
            "bg-[#0a0a2e]/90 backdrop-blur-md shadow-xl px-4 py-3 sm:px-5 sm:py-4",
            className,
          )}
          role="region"
          aria-label="Предложение сохранить данные"
        >
          <div className="flex gap-3">
            <div className="flex-shrink-0 flex items-center justify-center size-10 rounded-xl bg-indigo-500/20 border border-indigo-400/20">
              <Icon className="size-5 text-indigo-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/70">
                {proposal.revived
                  ? `Вернулись к теме — сохранить ${label}?`
                  : `Похоже, можно сохранить ${label}`}
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
                  className="bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl"
                  onClick={onConfirm}
                >
                  {isSaving ? "Сохраняем…" : "Сохранить"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isSaving}
                  className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl"
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
