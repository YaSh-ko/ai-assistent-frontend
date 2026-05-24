import { useCallback, useEffect, useRef, useState } from "react";
import { entriesApi, experimentsApi, goalsApi } from "@/lib/api-client";
import type { DetectorProposal } from "@/lib/detector-types";
import { useDetectorProposalStream } from "@/providers/Stream";
import { toast } from "sonner";

const CHIP_VISIBLE_MS = 10_000;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function createEntityFromProposal(
  proposal: DetectorProposal,
): Promise<{ id: string; path: string }> {
  const preview = proposal.preview ?? {};
  const title = (preview.title as string) || "Без названия";
  const description =
    (preview.description as string) ||
    (preview.hypothesis as string) ||
    title;
  const eventDate =
    (preview.event_date as string) ||
    (preview.eventdate as string) ||
    todayIsoDate();

  if (proposal.entity_type === "event") {
    const entry = await entriesApi.create({
      title,
      description,
      event_date: eventDate.slice(0, 10),
    });
    return { id: String(entry.id), path: `/event/${entry.id}` };
  }

  if (proposal.entity_type === "goal") {
    const created = await goalsApi.create({
      title,
      description,
    });
    return { id: String(created.id), path: `/goals/${created.id}` };
  }

  if (proposal.entity_type === "experiment") {
    const created = await experimentsApi.create({
      title,
      description,
    });
    return { id: String(created.id), path: `/experiment/${created.id}` };
  }

  throw new Error(`Неизвестный тип: ${proposal.entity_type}`);
}

/**
 * Shows detector chip from SSE custom event only (StreamProvider → streamProposal).
 */
export function useDetectorProposal() {
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
    if (streamProposal.pending_id === lastStreamProposalIdRef.current) return;
    lastStreamProposalIdRef.current = streamProposal.pending_id;
    showProposal(streamProposal);
  }, [streamProposal, showProposal]);

  const confirm = useCallback(async () => {
    if (!proposal || isSaving) return;
    setIsSaving(true);
    clearHideTimer();
    try {
      const { path } = await createEntityFromProposal(proposal);
      dismissChip();
      toast.success("Сохранено", {
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
  }, [proposal, isSaving, clearHideTimer, dismissChip, scheduleAutoHide]);

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
