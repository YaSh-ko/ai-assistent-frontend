import { Link } from "react-router-dom";
import { Target, X, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThreadContext } from "./context-banner";

type Props = {
  context: ThreadContext;
  onDismiss: () => void;
  className?: string;
};

/** Compact chip above the chat input — goal focus mode until dismissed. */
export function GoalFocusChip({ context, onDismiss, className }: Props) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
        <Target className="size-4 text-blue-300" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-blue-300/90">
          Запросы связаны с целью
        </p>
        <p className="truncate text-sm font-medium text-white/90">{context.title}</p>
        {context.entity_id && (
          <Link
            to={`/goals/${context.entity_id}`}
            className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] text-blue-300/80 hover:text-blue-200"
          >
            Открыть цель
            <ArrowUpRight className="size-3" />
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
        title="Отвязать от цели"
        aria-label="Отвязать сообщения от цели"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
