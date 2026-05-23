import { BaseMessage, isBaseMessage } from "@langchain/core/messages";
import { format } from "date-fns";
import { startCase } from "lodash";
import { HumanResponseWithEdits, SubmitType } from "./types";
import { HumanInterrupt } from "@langchain/langgraph/prebuilt";

export function prettifyText(action: string) {
  return startCase(action.replaceAll("_", " "));
}

export function isArrayOfMessages(
  value: Record<string, any>[],
): value is BaseMessage[] {
  if (value.every((v) => isBaseMessage(v))) {
    return true;
  }
  
  if (!Array.isArray(value)) {
    return false;
  }
  
  return value.every(
    (v) =>
      typeof v === "object" &&
      "id" in v &&
      "type" in v &&
      "content" in v &&
      "additional_kwargs" in v,
  );
}

function formatMessageContent(content: unknown): string {
  return typeof content === "string" ? content : JSON.stringify(content, null);
}

function formatToolCalls(item: any): string {
  if (!("tool_calls" in item)) {
    return "";
  }
  return ` - Tool calls: ${JSON.stringify(item.tool_calls, null)}`;
}

function getMessageType(item: any): string {
  if ("type" in item) {
    return item.type;
  }
  if ("_getType" in item) {
    return item._getType();
  }
  return "unknown";
}

function formatBaseMessage(item: BaseMessage): string {
  const contentText = formatMessageContent(item.content);
  const toolCallText = formatToolCalls(item);
  const messageType = getMessageType(item);
  
  const contentPart = contentText ? ` ${contentText}` : "";
  return `${messageType}:${contentPart}${toolCallText}`;
}

function formatObjectMessage(item: any): string {
  const contentText = formatMessageContent(item.content);
  const toolCallText = formatToolCalls(item);
  
  const contentPart = contentText ? ` ${contentText}` : "";
  return `${item.type}:${contentPart}${toolCallText}`;
}

export function baseMessageObject(item: unknown): string {
  if (isBaseMessage(item)) {
    return formatBaseMessage(item);
  }
  
  if (typeof item === "object" && item && "type" in item && "content" in item) {
    return formatObjectMessage(item);
  }

  if (typeof item === "object") {
    return JSON.stringify(item, null);
  }
  
  return item as string;
}

export function unknownToPrettyDate(input: unknown): string | undefined {
  try {
    const isDateObject = Object.prototype.toString.call(input) === "[object Date]";
    // Avoid treating ordinary numeric values like 42 as Unix timestamps.
    // We only format numbers that look like real millisecond timestamps.
    const isTimestampNumber =
      typeof input === "number" &&
      Number.isFinite(input) &&
      Math.abs(input) >= 100_000_000_000;
    const isDateString = typeof input === "string" && !Number.isNaN(Date.parse(input));

    if (!isDateObject && !isTimestampNumber && !isDateString) {
      return undefined;
    }

    const parsedDate = new Date(input as string | number | Date);
    if (Number.isNaN(parsedDate.getTime())) {
      return undefined;
    }

    return format(parsedDate, "MM/dd/yyyy hh:mm a");
  } catch {
    // failed to parse date. no-op
  }
  return undefined;
}

function processEditArgs(
  interrupt: HumanInterrupt,
  initialHumanInterruptEditValue: React.RefObject<Record<string, string>>,
): void {
  Object.entries(interrupt.action_request.args).forEach(([k, v]) => {
    const stringValue = typeof v === "string" ? v : JSON.stringify(v, null);

    if (!initialHumanInterruptEditValue.current || !(k in initialHumanInterruptEditValue.current)) {
      if (initialHumanInterruptEditValue.current) {
        initialHumanInterruptEditValue.current = {
          ...initialHumanInterruptEditValue.current,
          [k]: stringValue,
        };
      }
      return;
    }

    if (initialHumanInterruptEditValue.current[k] !== stringValue) {
      console.error(
        "KEY AND VALUE FOUND IN initialHumanInterruptEditValue.current THAT DOES NOT MATCH THE ACTION REQUEST",
        {
          key: k,
          value: stringValue,
          expectedValue: initialHumanInterruptEditValue.current[k],
        },
      );
    }
  });
}

function addEditResponse(
  responses: HumanResponseWithEdits[],
  interrupt: HumanInterrupt,
  initialHumanInterruptEditValue: React.RefObject<Record<string, string>>,
): void {
  if (!interrupt.config.allow_edit) {
    return;
  }

  if (interrupt.config.allow_accept) {
    processEditArgs(interrupt, initialHumanInterruptEditValue);
    responses.push({
      type: "edit",
      args: interrupt.action_request,
      acceptAllowed: true,
      editsMade: false,
    });
  } else {
    responses.push({
      type: "edit",
      args: interrupt.action_request,
      acceptAllowed: false,
    });
  }
}

function addResponseIfAllowed(
  responses: HumanResponseWithEdits[],
  interrupt: HumanInterrupt,
): void {
  if (interrupt.config.allow_respond) {
    responses.push({
      type: "response",
      args: "",
    });
  }
}

function addIgnoreIfAllowed(
  responses: HumanResponseWithEdits[],
  interrupt: HumanInterrupt,
): void {
  if (interrupt.config.allow_ignore) {
    responses.push({
      type: "ignore",
      args: null,
    });
  }
}

function determineDefaultSubmitType(responses: HumanResponseWithEdits[]): SubmitType | undefined {
  const hasResponse = responses.find((r) => r.type === "response");
  const hasAccept = responses.find((r) => r.acceptAllowed);
  const hasEdit = responses.find((r) => r.type === "edit");

  if (hasAccept) {
    return "accept";
  }
  if (hasResponse) {
    return "response";
  }
  if (hasEdit) {
    return "edit";
  }
  return undefined;
}

function addMissingResponses(
  responses: HumanResponseWithEdits[],
  interrupt: HumanInterrupt,
): void {
  const acceptAllowedConfig = interrupt.config.allow_accept;
  const ignoreAllowedConfig = interrupt.config.allow_ignore;

  const hasAcceptResponse = responses.some((r) => r.type === "accept");
  const hasIgnoreResponse = responses.some((r) => r.type === "ignore");

  if (acceptAllowedConfig && !hasAcceptResponse) {
    responses.push({
      type: "accept",
      args: null,
    });
  }
  
  if (ignoreAllowedConfig && !hasIgnoreResponse) {
    responses.push({
      type: "ignore",
      args: null,
    });
  }
}

export function createDefaultHumanResponse(
  interrupt: HumanInterrupt,
  initialHumanInterruptEditValue: React.RefObject<Record<string, string>>,
): {
  responses: HumanResponseWithEdits[];
  defaultSubmitType: SubmitType | undefined;
  hasAccept: boolean;
} {
  const responses: HumanResponseWithEdits[] = [];

  addEditResponse(responses, interrupt, initialHumanInterruptEditValue);
  addResponseIfAllowed(responses, interrupt);
  addIgnoreIfAllowed(responses, interrupt);

  const defaultSubmitType = determineDefaultSubmitType(responses);
  const hasAccept = responses.some((r) => r.acceptAllowed) || interrupt.config.allow_accept;

  addMissingResponses(responses, interrupt);

  return { responses, defaultSubmitType, hasAccept };
}

export function constructOpenInStudioURL(
  deploymentUrl: string,
  threadId?: string,
) {
  const smithStudioURL = new URL("https://smith.langchain.com/studio/thread");
  // trim the trailing slash from deploymentUrl
  const trimmedDeploymentUrl = deploymentUrl.replace(/\/$/, "");

  if (threadId) {
    smithStudioURL.pathname += `/${threadId}`;
  }

  smithStudioURL.searchParams.append("baseUrl", trimmedDeploymentUrl);

  return smithStudioURL.toString();
}

export function haveArgsChanged(
  args: unknown,
  initialValues: Record<string, string>,
): boolean {
  if (typeof args !== "object" || !args) {
    return false;
  }

  const currentValues = args as Record<string, string>;

  return Object.entries(currentValues).some(([key, value]) => {
    const valueString = ["string", "number"].includes(typeof value)
      ? value.toString()
      : JSON.stringify(value, null);
    return initialValues[key] !== valueString;
  });
}
