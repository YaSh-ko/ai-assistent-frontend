import { useEffect } from "react";
import { toast } from "sonner";
import { goalsApi } from "@/lib/api-client";
import type { ThreadContext } from "@/components/thread/context-banner";

export type GoalFocusMetadata = {
  type: "goal";
  entity_id: string;
  title: string;
  description?: string;
  priority?: string;
  target_date?: string;
  existing_tasks?: string[];
};

/**
 * Loads goal data for "focus mode": next messages are about this goal until user dismisses the chip.
 * Does not bind or create chat threads — only UI + detector metadata.
 */
export function useGoalFocus(
  goalFocusId: string | null,
  setGoalFocusBanner: (ctx: ThreadContext | null) => void,
  setGoalMetadata: (meta: GoalFocusMetadata | null) => void,
) {
  useEffect(() => {
    if (!goalFocusId) {
      setGoalFocusBanner(null);
      setGoalMetadata(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [goal, tasks] = await Promise.all([
          goalsApi.getById(goalFocusId),
          goalsApi.getTasks(goalFocusId).catch(() => []),
        ]);
        if (cancelled) return;

        setGoalFocusBanner({
          type: "goal",
          entity_id: goalFocusId,
          title: goal.title,
          description: goal.description ?? undefined,
        });

        setGoalMetadata({
          type: "goal",
          entity_id: goalFocusId,
          title: goal.title,
          description: goal.description ?? undefined,
          priority: goal.priority ?? undefined,
          target_date: goal.target_date
            ? String(goal.target_date).slice(0, 10)
            : undefined,
          existing_tasks: tasks
            .filter((t) => t.status !== "completed")
            .map((t) => t.title)
            .slice(0, 20),
        });
      } catch {
        if (!cancelled) {
          toast.error("Не удалось загрузить цель");
          setGoalFocusBanner(null);
          setGoalMetadata(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [goalFocusId, setGoalFocusBanner, setGoalMetadata]);
}
