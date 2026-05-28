import { useCallback, useEffect, useRef, useState } from "react";
import { chatApi, entriesApi, goalsApi } from "@/lib/api-client";
import type { GoalFocusMetadata } from "@/hooks/useGoalFocus";
import type { DetectorProposal } from "@/lib/detector-types";
import { useDetectorProposalStream } from "@/providers/Stream";
import { toast } from "sonner";

const CHIP_VISIBLE_MS = 10_000;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function ensureIsoDate(raw: unknown): string {
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }
  return todayIsoDate();
}

async function createEntityFromProposal(
  proposal: DetectorProposal,
  threadId?: string | null,
  goalFocus?: GoalFocusMetadata | null,
): Promise<{ id: string; path: string }> {
  const preview = proposal.preview ?? {};
  const title = (preview.title as string) || "Без названия";
  const description = (preview.description as string) || title;

  let id: string;
  let path: string;
  const entityType = proposal.entity_type as "observation" | "goal" | "task";

  if (entityType === "observation") {
    const entry = await entriesApi.create({
      title,
      description,
      event_date: ensureIsoDate(preview.event_date),
    });
    id = String(entry.id);
    path = `/event/${id}`;
  } else if (entityType === "goal") {
    const created = await goalsApi.create({
      title,
      description,
      priority: (preview.priority as string) || "medium",
      ...(typeof preview.target_date === "string" && /^\d{4}-\d{2}-\d{2}/.test(preview.target_date)
        ? { target_date: preview.target_date.slice(0, 10) }
        : {}),
    });
    id = String(created.id);
    path = `/goals/${id}`;
  } else if (entityType === "task") {
    let goalId: string | undefined = goalFocus?.entity_id;
    if (!goalId && threadId) {
      const ctx = await chatApi.getThreadContext(threadId);
      if (ctx?.type === "goal" && ctx.entity_id) {
        goalId = String(ctx.entity_id);
      }
    }
    if (goalId) {
      const deadline =
        typeof preview.deadline === "string" && /^\d{4}-\d{2}-\d{2}/.test(preview.deadline)
          ? preview.deadline.slice(0, 10)
          : undefined;
      const created = await goalsApi.createTask(goalId, {
        title,
        description,
        phase: "now",
        ...(deadline ? { due_date: deadline } : {}),
        source: "ai",
      });
      id = String(created.id);
      path = `/goals/${goalId}`;
    } else {
      throw new Error(
        "Шаги сохраняются в чате по цели. Открой цель → «Чат по цели» и обсуди шаги там.",
      );
    }
  } else {
    throw new Error(`Неизвестный тип: ${proposal.entity_type}`);
  }

  if (threadId) {
    void chatApi.linkThreadToEntity(threadId, entityType, id).catch(() => undefined);
  }

  return { id, path };
}

async function updateEntityFromProposal(
  proposal: DetectorProposal,
  threadId?: string | null,
  goalFocus?: GoalFocusMetadata | null,
): Promise<{ id: string; path: string }> {
  const existingId = proposal.existing_entity_id;
  if (!existingId) throw new Error("existing_entity_id is required for update");

  const preview = proposal.preview ?? {};
  const description = (preview.description as string) || undefined;
  const entityType = proposal.entity_type as "observation" | "goal" | "task";

  if (entityType === "observation") {
    await entriesApi.patch(existingId, {
      ...(description ? { description } : {}),
      ...(preview.title ? { title: preview.title } : {}),
    });
    if (threadId) {
      void chatApi.linkThreadToEntity(threadId, entityType, existingId).catch(() => undefined);
    }
    return { id: existingId, path: `/event/${existingId}` };
  }

  if (entityType === "goal") {
    await goalsApi.update(existingId, {
      ...(description ? { description } : {}),
      ...(preview.title ? { title: preview.title } : {}),
      ...(preview.priority ? { priority: preview.priority } : {}),
    });
    if (threadId) {
      void chatApi.linkThreadToEntity(threadId, entityType, existingId).catch(() => undefined);
    }
    return { id: existingId, path: `/goals/${existingId}` };
  }

  if (entityType === "task") {
    let goalId: string | undefined = goalFocus?.entity_id;
    if (!goalId && threadId) {
      const ctx = await chatApi.getThreadContext(threadId);
      if (ctx?.type === "goal" && ctx.entity_id) {
        goalId = String(ctx.entity_id);
      }
    }
    if (goalId) {
      await goalsApi.updateTask(goalId, existingId, {
        ...(preview.title ? { title: preview.title as string } : {}),
      });
      return { id: existingId, path: `/goals/${goalId}` };
    }
    throw new Error("Обновление шага доступно только в чате по цели.");
  }

  throw new Error(`Неизвестный тип: ${proposal.entity_type}`);
}

/**
 * Shows detector chip from SSE custom event only (StreamProvider → streamProposal).
 */
export function useDetectorProposal(
  threadId?: string | null,
  goalFocus?: GoalFocusMetadata | null,
) {
  const { streamProposal, clearStreamProposal } = useDetectorProposalStream();
  const [proposal, setProposal] = useState<DetectorProposal | null>(null);
  const [visible, setVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStreamProposalIdRef = useRef<string | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const dismissChip = useCallback(() => {
    clearHideTimer();
    setVisible(false);
    setProposal(null);
    clearStreamProposal();
  }, [clearHideTimer, clearStreamProposal]);

  const scheduleAutoHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, CHIP_VISIBLE_MS);
  }, [clearHideTimer]);

  const showProposal = useCallback(
    (next: DetectorProposal) => {
      setProposal(next);
      setVisible(true);
      scheduleAutoHide();
    },
    [scheduleAutoHide],
  );

  useEffect(() => {
    if (!streamProposal) {
      lastStreamProposalIdRef.current = null;
    }
  }, [streamProposal]);

  useEffect(() => {
    if (!streamProposal?.show_chip) return;
    const key = `${streamProposal.pending_id}:${streamProposal.action}`;
    if (key === lastStreamProposalIdRef.current) return;
    lastStreamProposalIdRef.current = key;
    showProposal(streamProposal);
  }, [streamProposal, showProposal]);

  const confirm = useCallback(async () => {
    if (!proposal || isSaving) return;
    setIsSaving(true);
    clearHideTimer();

    const isUpdate = proposal.action === "confirm_update" && proposal.existing_entity_id;

    try {
      const { path } = isUpdate
        ? await updateEntityFromProposal(proposal, threadId, goalFocus)
        : await createEntityFromProposal(proposal, threadId, goalFocus);

      dismissChip();
      const savedLabel =
        !isUpdate && proposal.entity_type === "task" && path.startsWith("/goals/")
          ? "Задача добавлена к цели"
          : isUpdate
            ? "Обновлено"
            : "Сохранено";
      toast.success(savedLabel, {
        description: "Открыть страницу?",
        action: {
          label: "Открыть",
          onClick: () => {
            globalThis.location.href = path;
          },
        },
        duration: 8000,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Не удалось сохранить";
      toast.error(message);
      scheduleAutoHide();
    } finally {
      setIsSaving(false);
    }
  }, [proposal, isSaving, clearHideTimer, dismissChip, scheduleAutoHide, threadId, goalFocus]);

  const decline = useCallback(() => {
    dismissChip();
  }, [dismissChip]);

  return {
    proposal: visible ? proposal : null,
    isSaving,
    confirm,
    decline,
    dismissChip,
  };
}
