/** Detector chip payload from AI service (SSE event detector_proposal or GET proposal). */
export type DetectorProposal = {
  show_chip: boolean;
  action: "confirm_create" | "confirm_update" | string;
  entity_type: "observation" | "goal" | "task" | string;
  confidence: number;
  pending_id: string;
  preview: {
    title?: string;
    description?: string;
    event_date?: string | null;
    target_date?: string | null;
    deadline?: string | null;
    priority?: string;
    measurable?: string;
    area?: string;
    [key: string]: unknown;
  };
  revived?: boolean;
  existing_entity_id?: string | null;
  existing_title?: string | null;
};

export const DETECTOR_ENTITY_LABELS: Record<string, string> = {
  observation: "наблюдение",
  goal: "цель",
  task: "задача",
};
