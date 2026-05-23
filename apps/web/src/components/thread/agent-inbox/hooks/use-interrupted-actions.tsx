import { HumanResponseWithEdits, SubmitType } from "../types";
import {
  KeyboardEvent,
  Dispatch,
  SetStateAction,
  RefObject,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { createDefaultHumanResponse } from "../utils";
import { toast } from "sonner";
import { HumanInterrupt, HumanResponse } from "@langchain/langgraph/prebuilt";
import { END } from "@langchain/langgraph/web";
import { useStreamContext } from "@/providers/Stream";

interface UseInterruptedActionsInput {
  interrupt: HumanInterrupt;
}

interface UseInterruptedActionsValue {
  // Actions
  handleSubmit: (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent> | KeyboardEvent,
  ) => Promise<void>;
  handleIgnore: (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => Promise<void>;
  handleResolve: (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => Promise<void>;

  // State values
  streaming: boolean;
  streamFinished: boolean;
  loading: boolean;
  supportsMultipleMethods: boolean;
  hasEdited: boolean;
  hasAddedResponse: boolean;
  acceptAllowed: boolean;
  humanResponse: HumanResponseWithEdits[];

  // State setters
  setSelectedSubmitType: Dispatch<SetStateAction<SubmitType | undefined>>;
  setHumanResponse: Dispatch<SetStateAction<HumanResponseWithEdits[]>>;
  setHasAddedResponse: Dispatch<SetStateAction<boolean>>;
  setHasEdited: Dispatch<SetStateAction<boolean>>;

  // Refs
  initialHumanInterruptEditValue: RefObject<Record<string, string>>;
}

export default function useInterruptedActions({
  interrupt,
}: UseInterruptedActionsInput): UseInterruptedActionsValue {
  const thread = useStreamContext();
  const [humanResponse, setHumanResponse] = useState<HumanResponseWithEdits[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamFinished, setStreamFinished] = useState(false);
  const initialHumanInterruptEditValue = useRef<Record<string, string>>({});
  const [selectedSubmitType, setSelectedSubmitType] = useState<SubmitType>();
  // Whether or not the user has edited any fields which allow editing.
  const [hasEdited, setHasEdited] = useState(false);
  // Whether or not the user has added a response.
  const [hasAddedResponse, setHasAddedResponse] = useState(false);
  const [acceptAllowed, setAcceptAllowed] = useState(false);

  useEffect(() => {
    try {
      const { responses, defaultSubmitType, hasAccept } =
        createDefaultHumanResponse(interrupt, initialHumanInterruptEditValue);
      setSelectedSubmitType(defaultSubmitType);
      setHumanResponse(responses);
      setAcceptAllowed(hasAccept);
    } catch (e) {
      console.error("Error formatting and setting human response state", e);
    }
  }, [interrupt]);

  const resumeRun = useCallback((response: HumanResponse[]): boolean => {
    try {
      thread.submit(
        {},
        {
          command: {
            resume: response,
          },
        },
      );
      return true;
    } catch (e: unknown) {
      console.error("Error sending human response", e);
      return false;
    }
  }, [thread]);

  const showErrorToast = useCallback((message: string, description: string) => {
    toast.error(message, {
      description,
      richColors: true,
      closeButton: true,
      duration: 5000,
    });
  }, []);

  const showSuccessToast = useCallback((description: string, duration = 5000) => {
    toast("Success", {
      description,
      duration,
    });
  }, []);

  const processHumanResponseInput = useCallback((responses: HumanResponseWithEdits[]): HumanResponse[] => {
    return responses.flatMap((r) => {
      if (r.type === "edit") {
        if (r.acceptAllowed && !r.editsMade) {
          return {
            type: "accept",
            args: r.args,
          };
        } else {
          return {
            type: "edit",
            args: r.args,
          };
        }
      }

      if (r.type === "response" && !r.args) {
        // If response was allowed but no response was given, do not include in the response
        return [];
      }
      return {
        type: r.type,
        args: r.args,
      };
    });
  }, []);

  const handleSubmitError = useCallback((e: unknown) => {
    console.error("Error sending human response", e);

    if (e && typeof e === 'object' && 'message' in e && 
        typeof e.message === 'string' && e.message.includes("Invalid assistant ID")) {
      showErrorToast(
        "Error: Invalid assistant ID",
        "The provided assistant ID was not found in this graph. Please update the assistant ID in the settings and try again."
      );
    } else {
      showErrorToast("Error", "Failed to submit response.");
    }
  }, [showErrorToast]);

  const handleSubmit = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent> | KeyboardEvent,
  ) => {
    e.preventDefault();
    if (!humanResponse) {
      showErrorToast("Error", "Please enter a response.");
      return;
    }

    let errorOccurred = false;
    if (initialHumanInterruptEditValue.current) {
      initialHumanInterruptEditValue.current = {};
    }

    const hasResponseTypes = humanResponse.some((r) => 
      ["response", "edit", "accept"].includes(r.type)
    );

    if (hasResponseTypes) {
      setStreamFinished(false);

      try {
        const humanResponseInput = processHumanResponseInput(humanResponse);

        const input = humanResponseInput.find(
          (r) => r.type === selectedSubmitType,
        );
        if (!input) {
          showErrorToast("Error", "No response found.");
          return;
        }

        setLoading(true);
        setStreaming(true);
        const resumedSuccessfully = resumeRun([input]);
        if (!resumedSuccessfully) {
          return;
        }

        showSuccessToast("Response submitted successfully.");

        if (!errorOccurred) {
          setStreamFinished(true);
        }
      } catch (e: unknown) {
        handleSubmitError(e);
        errorOccurred = true;
        setStreaming(false);
        setStreamFinished(false);
      }

      if (!errorOccurred) {
        setStreaming(false);
        setStreamFinished(false);
      }
    } else {
      setLoading(true);
      resumeRun(humanResponse);
      showSuccessToast("Response submitted successfully.");
    }

    setLoading(false);
  };

  const handleIgnore = useCallback(async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e.preventDefault();

    const ignoreResponse = humanResponse.find((r) => r.type === "ignore");
    if (!ignoreResponse) {
      toast.error("Error", {
        description: "The selected thread does not support ignoring.",
        duration: 5000,
      });
      return;
    }

    setLoading(true);
    if (initialHumanInterruptEditValue.current) {
      initialHumanInterruptEditValue.current = {};
    }

    resumeRun([ignoreResponse]);

    setLoading(false);
    toast("Successfully ignored thread", {
      duration: 5000,
    });
  }, [humanResponse, resumeRun]);

  const handleResolve = useCallback(async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e.preventDefault();

    setLoading(true);
    if (initialHumanInterruptEditValue.current) {
      initialHumanInterruptEditValue.current = {};
    }

    try {
      thread.submit(
        {},
        {
          command: {
            goto: END,
          },
        },
      );

      toast("Success", {
        description: "Marked thread as resolved.",
        duration: 3000,
      });
    } catch (e) {
      console.error("Error marking thread as resolved", e);
      toast.error("Error", {
        description: "Failed to mark thread as resolved.",
        richColors: true,
        closeButton: true,
        duration: 3000,
      });
    }

    setLoading(false);
  }, [thread]);

  const supportsMultipleMethods =
    humanResponse.filter(
      (r) => r.type === "edit" || r.type === "accept" || r.type === "response",
    ).length > 1;

  return {
    handleSubmit,
    handleIgnore,
    handleResolve,
    humanResponse,
    streaming,
    streamFinished,
    loading,
    supportsMultipleMethods,
    hasEdited,
    hasAddedResponse,
    acceptAllowed,
    setSelectedSubmitType,
    setHumanResponse,
    setHasAddedResponse,
    setHasEdited,
    initialHumanInterruptEditValue,
  };
}
