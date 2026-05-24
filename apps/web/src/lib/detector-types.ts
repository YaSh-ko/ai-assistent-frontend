/** Detector chip payload from AI service (SSE event detector_proposal or GET proposal). */
export type DetectorProposal = {
  show_chip: boolean;
  action: string;
  entity_type: "event" | "goal" | "experiment" | string;
  confidence: number;
  pending_id: string;
  preview: {
    title?: string;
    description?: string;
    event_date?: string | null;
    eventdate?: string | null;
    target_date?: string | null;
    priority?: string;
    hypothesis?: string;
    [key: string]: unknown;
  };
  revived?: boolean;
};

export const DETECTOR_ENTITY_LABELS: Record<string, string> = {
  event: "запись",
  goal: "цель",
  experiment: "эксперимент",
};
