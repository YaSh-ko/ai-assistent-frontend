import { HumanResponseWithEdits, SubmitType } from "../types";
import { Textarea } from "@/components/ui/textarea";
import React, { useCallback } from "react";
import { haveArgsChanged, prettifyText } from "../utils";
import { Button } from "@/components/ui/button";
import { Undo2 } from "lucide-react";
import { MarkdownText } from "../../markdown-text";
import { ActionRequest, HumanInterrupt } from "@langchain/langgraph/prebuilt";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

function createKeyDownHandler(
  handleSubmit: (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent> | React.KeyboardEvent,
  ) => Promise<void>
) {
  return (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e);
    }
  };
}

function ResetButton({ handleReset }: Readonly<{ handleReset: () => void }>) {
  return (
    <Button
      onClick={handleReset}
      variant="ghost"
      className="flex items-center justify-center gap-2 text-gray-500 hover:text-red-500"
    >
      <Undo2 className="w-4 h-4" />
      <span>Reset</span>
    </Button>
  );
}

function ArgsRenderer({ args }: Readonly<{ args: Record<string, any> }>) {
  return (
    <div className="flex flex-col gap-6 items-start w-full">
      {Object.entries(args).map(([k, v]) => {
        const value = ["string", "number"].includes(typeof v)
          ? v.toString()
          : JSON.stringify(v, null);

        return (
          <div key={`args-${k}`} className="flex flex-col gap-1 items-start">
            <p className="text-sm leading-[18px] text-gray-600 text-wrap">
              {prettifyText(k)}:
            </p>
            <span className="text-[13px] leading-[18px] text-black bg-zinc-100 rounded-xl p-3 w-full max-w-full">
              <MarkdownText>{value}</MarkdownText>
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface InboxItemInputProps {
  readonly interruptValue: HumanInterrupt;
  readonly humanResponse: HumanResponseWithEdits[];
  readonly supportsMultipleMethods: boolean;
  readonly acceptAllowed: boolean;
  readonly hasEdited: boolean;
  readonly hasAddedResponse: boolean;
  readonly initialValues: Record<string, string>;
  readonly streaming: boolean;
  readonly streamFinished: boolean;
  readonly setHumanResponse: React.Dispatch<
    React.SetStateAction<HumanResponseWithEdits[]>
  >;
  readonly setSelectedSubmitType: React.Dispatch<
    React.SetStateAction<SubmitType | undefined>
  >;
  readonly setHasAddedResponse: React.Dispatch<React.SetStateAction<boolean>>;
  readonly setHasEdited: React.Dispatch<React.SetStateAction<boolean>>;
  readonly handleSubmit: (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent> | React.KeyboardEvent,
  ) => Promise<void>;
}

function ResponseComponent({
  humanResponse,
  streaming,
  showArgsInResponse,
  interruptValue,
  onResponseChange,
  handleSubmit,
}: Readonly<{
  humanResponse: HumanResponseWithEdits[];
  streaming: boolean;
  showArgsInResponse: boolean;
  interruptValue: HumanInterrupt;
  onResponseChange: (change: string, response: HumanResponseWithEdits) => void;
  handleSubmit: (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent> | React.KeyboardEvent,
  ) => Promise<void>;
}>) {
  const res = humanResponse.find((r) => r.type === "response");
  if (!res || typeof res.args !== "string") {
    return null;
  }

  const handleKeyDown = createKeyDownHandler(handleSubmit);

  const handleReset = () => {
    onResponseChange("", res);
  };

  return (
    <div className="flex flex-col gap-4 p-6 items-start w-full rounded-xl border-[1px] border-gray-300">
      <div className="flex items-center justify-between w-full">
        <p className="font-semibold text-black text-base">
          Respond to assistant
        </p>
        <ResetButton handleReset={handleReset} />
      </div>

      {showArgsInResponse && (
        <ArgsRenderer args={interruptValue.action_request.args} />
      )}

      <div className="flex flex-col gap-[6px] items-start w-full">
        <p className="text-sm min-w-fit font-medium">Response</p>
        <Textarea
          disabled={streaming}
          value={res.args}
          onChange={(e) => onResponseChange(e.target.value, res)}
          onKeyDown={handleKeyDown}
          rows={4}
          placeholder="Your response here..."
        />
      </div>

      <div className="flex items-center justify-end w-full gap-2">
        <Button variant="brand" disabled={streaming} onClick={handleSubmit}>
          Send Response
        </Button>
      </div>
    </div>
  );
}
const Response = React.memo(ResponseComponent);

function AcceptComponent({
  streaming,
  actionRequestArgs,
  handleSubmit,
}: Readonly<{
  streaming: boolean;
  actionRequestArgs: Record<string, any>;
  handleSubmit: (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent> | React.KeyboardEvent,
  ) => Promise<void>;
}>) {
  const hasArgs = actionRequestArgs && Object.keys(actionRequestArgs).length > 0;
  
  return (
    <div className="flex flex-col gap-4 items-start w-full p-6 rounded-lg border-[1px] border-gray-300">
      {hasArgs && <ArgsRenderer args={actionRequestArgs} />}
      <Button
        variant="brand"
        disabled={streaming}
        onClick={handleSubmit}
        className="w-full"
      >
        Accept
      </Button>
    </div>
  );
}

function calculateDefaultRows(value: any): number {
  if (!value?.length) {
    return 3;
  }
  return Math.max(value.length / 30, 7);
}

function getButtonText(editResponse: HumanResponseWithEdits): string {
  if (editResponse.acceptAllowed && !editResponse.editsMade) {
    return "Accept";
  }
  return "Submit";
}

function getHeaderText(editResponse: HumanResponseWithEdits): string {
  return editResponse.acceptAllowed ? "Edit/Accept" : "Edit";
}

function createResetValues(
  initialValues: Record<string, string>,
  editResponse: HumanResponseWithEdits
): { keysToReset: string[]; valuesToReset: string[] } {
  const keysToReset: string[] = [];
  const valuesToReset: string[] = [];
  
  if (
    !editResponse?.args ||
    typeof editResponse.args !== "object" ||
    !editResponse.args.args
  ) {
    return { keysToReset, valuesToReset };
  }

  Object.entries(initialValues).forEach(([k, v]) => {
    if (k in (editResponse.args as Record<string, any>).args) {
      const value = ["string", "number"].includes(typeof v)
        ? v
        : JSON.stringify(v, null);
      keysToReset.push(k);
      valuesToReset.push(value);
    }
  });

  return { keysToReset, valuesToReset };
}

function EditFieldComponent({
  fieldKey,
  fieldValue,
  index,
  streaming,
  defaultRows,
  onEditChange,
  editResponse,
  handleKeyDown,
}: Readonly<{
  fieldKey: string;
  fieldValue: any;
  index: number;
  streaming: boolean;
  defaultRows: Record<string, number>;
  onEditChange: (
    text: string | string[],
    response: HumanResponseWithEdits,
    key: string | string[],
  ) => void;
  editResponse: HumanResponseWithEdits;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}>) {
  const value = ["string", "number"].includes(typeof fieldValue)
    ? fieldValue
    : JSON.stringify(fieldValue, null);

  const numRows = defaultRows[fieldKey] || 8;

  return (
    <div
      className="flex flex-col gap-1 items-start w-full h-full px-[1px]"
      key={`allow-edit-args--${fieldKey}-${index}`}
    >
      <div className="flex flex-col gap-[6px] items-start w-full">
        <p className="text-sm min-w-fit font-medium">{prettifyText(fieldKey)}</p>
        <Textarea
          disabled={streaming}
          className="h-full"
          value={value}
          onChange={(e) => onEditChange(e.target.value, editResponse, fieldKey)}
          onKeyDown={handleKeyDown}
          rows={numRows}
        />
      </div>
    </div>
  );
}

function EditAndOrAcceptComponent({
  humanResponse,
  streaming,
  initialValues,
  onEditChange,
  handleSubmit,
  interruptValue,
}: Readonly<{
  humanResponse: HumanResponseWithEdits[];
  streaming: boolean;
  initialValues: Record<string, string>;
  interruptValue: HumanInterrupt;
  onEditChange: (
    text: string | string[],
    response: HumanResponseWithEdits,
    key: string | string[],
  ) => void;
  handleSubmit: (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent> | React.KeyboardEvent,
  ) => Promise<void>;
}>) {
  const defaultRows = React.useRef<Record<string, number>>({});
  const editResponse = humanResponse.find((r) => r.type === "edit");
  const acceptResponse = humanResponse.find((r) => r.type === "accept");
  
  if (
    !editResponse ||
    typeof editResponse.args !== "object" ||
    !editResponse.args
  ) {
    if (acceptResponse) {
      return (
        <AcceptComponent
          actionRequestArgs={interruptValue.action_request.args}
          streaming={streaming}
          handleSubmit={handleSubmit}
        />
      );
    }
    return null;
  }

  const header = getHeaderText(editResponse);
  const buttonText = getButtonText(editResponse);

  const handleReset = () => {
    const { keysToReset, valuesToReset } = createResetValues(initialValues, editResponse);
    
    if (keysToReset.length > 0 && valuesToReset.length > 0) {
      onEditChange(valuesToReset, editResponse, keysToReset);
    }
  };

  const handleKeyDown = createKeyDownHandler(handleSubmit);

  // Initialize default rows for each field
  Object.entries(editResponse.args.args).forEach(([k, v]) => {
    defaultRows.current[k] ??= calculateDefaultRows(v);
  });

  return (
    <div className="flex flex-col gap-4 items-start w-full p-6 rounded-lg border-[1px] border-gray-300">
      <div className="flex items-center justify-between w-full">
        <p className="font-semibold text-black text-base">{header}</p>
        <ResetButton handleReset={handleReset} />
      </div>

      {Object.entries(editResponse.args.args).map(([k, v], idx) => (
        <EditFieldComponent
          key={`edit-field-${k}`}
          fieldKey={k}
          fieldValue={v}
          index={idx}
          streaming={streaming}
          defaultRows={defaultRows.current}
          onEditChange={onEditChange}
          editResponse={editResponse}
          handleKeyDown={handleKeyDown}
        />
      ))}

      <div className="flex items-center justify-end w-full gap-2">
        <Button variant="brand" disabled={streaming} onClick={handleSubmit}>
          {buttonText}
        </Button>
      </div>
    </div>
  );
}
const EditAndOrAccept = React.memo(EditAndOrAcceptComponent);

function validateEditChange(
  change: string | string[],
  key: string | string[]
): boolean {
  return !(
    (Array.isArray(change) && !Array.isArray(key)) ||
    (!Array.isArray(change) && Array.isArray(key))
  );
}

function updateArgsForEdit(
  change: string | string[],
  key: string | string[],
  responseArgs: Record<string, any> | null
): Record<string, any> {
  const updatedArgs = { ...responseArgs?.args };

  if (Array.isArray(change) && Array.isArray(key)) {
    change.forEach((value, index) => {
      if (index < key.length) {
        updatedArgs[key[index]] = value;
      }
    });
  } else {
    updatedArgs[key as string] = change as string;
  }

  return updatedArgs;
}

function updateSubmitTypeForEdit(
  valuesChanged: boolean,
  acceptAllowed: boolean,
  hasAddedResponse: boolean,
  setSelectedSubmitType: React.Dispatch<React.SetStateAction<SubmitType | undefined>>,
  setHasEdited: React.Dispatch<React.SetStateAction<boolean>>
): void {
  if (valuesChanged) {
    setSelectedSubmitType("edit");
    setHasEdited(true);
    return;
  }
  
  setHasEdited(false);
  if (acceptAllowed) {
    setSelectedSubmitType("accept");
  } else if (hasAddedResponse) {
    setSelectedSubmitType("response");
  }
}

function createNewEditResponse(
  change: string | string[],
  key: string | string[],
  response: HumanResponseWithEdits,
  valuesChanged: boolean
): HumanResponseWithEdits {
  const newEdit: HumanResponseWithEdits = {
    type: response.type,
    args: {
      action: (response.args as ActionRequest).action,
      args:
        Array.isArray(change) && Array.isArray(key)
          ? {
              ...(response.args as ActionRequest).args,
              ...Object.fromEntries(key.map((k, i) => [k, change[i]])),
            }
          : {
              ...(response.args as ActionRequest).args,
              [key as string]: change as string,
            },
    },
  };

  if (response.acceptAllowed) {
    return {
      ...newEdit,
      acceptAllowed: true,
      editsMade: valuesChanged,
    };
  }

  return newEdit;
}

function updateResponseStateForChange(
  change: string,
  hasEdited: boolean,
  acceptAllowed: boolean,
  setHasAddedResponse: React.Dispatch<React.SetStateAction<boolean>>,
  setSelectedSubmitType: React.Dispatch<React.SetStateAction<SubmitType | undefined>>
): void {
  if (change) {
    setSelectedSubmitType("response");
    setHasAddedResponse(true);
    return;
  }
  
  setHasAddedResponse(false);
  if (hasEdited) {
    setSelectedSubmitType("edit");
  } else if (acceptAllowed) {
    setSelectedSubmitType("accept");
  }
}

function createNewResponseObject(
  change: string,
  response: HumanResponseWithEdits
): HumanResponseWithEdits {
  const newResponse: HumanResponseWithEdits = {
    type: response.type,
    args: change,
  };

  if (response.acceptAllowed) {
    return {
      ...newResponse,
      acceptAllowed: true,
      editsMade: !!change,
    };
  }
  
  return newResponse;
}

export function InboxItemInput({
  interruptValue,
  humanResponse,
  streaming,
  streamFinished,
  supportsMultipleMethods,
  acceptAllowed,
  hasEdited,
  hasAddedResponse,
  initialValues,
  setHumanResponse,
  setSelectedSubmitType,
  setHasEdited,
  setHasAddedResponse,
  handleSubmit,
}: InboxItemInputProps) {
  const isEditAllowed = interruptValue.config.allow_edit;
  const isResponseAllowed = interruptValue.config.allow_respond;
  const hasArgs = Object.entries(interruptValue.action_request.args).length > 0;
  const showArgsInResponse =
    hasArgs && !isEditAllowed && !acceptAllowed && isResponseAllowed;
  const showArgsOutsideActionCards =
    hasArgs && !showArgsInResponse && !isEditAllowed && !acceptAllowed;

  const onEditChange = useCallback((
    change: string | string[],
    response: HumanResponseWithEdits,
    key: string | string[],
  ) => {
    if (!validateEditChange(change, key)) {
      toast.error("Error", {
        description: "Something went wrong",
        richColors: true,
        closeButton: true,
      });
      return;
    }

    let valuesChanged = true;
    if (typeof response.args === "object") {
      const updatedArgs = updateArgsForEdit(change, key, response.args);
      const haveValuesChanged = haveArgsChanged(updatedArgs, initialValues);
      valuesChanged = haveValuesChanged;
    }

    updateSubmitTypeForEdit(
      valuesChanged,
      acceptAllowed,
      hasAddedResponse,
      setSelectedSubmitType,
      setHasEdited
    );

    setHumanResponse((prev) => {
      if (typeof response.args !== "object" || !response.args) {
        console.error(
          "Mismatched response type",
          !!response.args,
          typeof response.args,
        );
        return prev;
      }

      const newEdit = createNewEditResponse(change, key, response, valuesChanged);
      
      const matchingResponse = prev.find(
        (p) =>
          p.type === response.type &&
          typeof p.args === "object" &&
          p.args?.action === (response.args as ActionRequest).action,
      );

      if (matchingResponse) {
        return prev.map((p) => {
          if (
            p.type === response.type &&
            typeof p.args === "object" &&
            p.args?.action === (response.args as ActionRequest).action
          ) {
            return newEdit;
          }
          return p;
        });
      } else {
        throw new Error("No matching response found");
      }
    });
  }, [acceptAllowed, hasAddedResponse, initialValues, setHasEdited, setHumanResponse, setSelectedSubmitType]);

  const onResponseChange = useCallback((
    change: string,
    response: HumanResponseWithEdits,
  ) => {
    updateResponseStateForChange(
      change,
      hasEdited,
      acceptAllowed,
      setHasAddedResponse,
      setSelectedSubmitType
    );

    setHumanResponse((prev) => {
      const newResponse = createNewResponseObject(change, response);

      const matchingResponse = prev.find((p) => p.type === response.type);
      if (matchingResponse) {
        return prev.map((p) => {
          if (p.type === response.type) {
            return newResponse;
          }
          return p;
        });
      } else {
        throw new Error("No human response found for string response");
      }
    });
  }, [hasEdited, acceptAllowed, setHasAddedResponse, setSelectedSubmitType, setHumanResponse]);

  return (
    <div className="w-full flex flex-col items-start justify-start gap-2">
      {showArgsOutsideActionCards && (
        <ArgsRenderer args={interruptValue.action_request.args} />
      )}

      <div className="flex flex-col gap-2 items-start w-full">
        <EditAndOrAccept
          humanResponse={humanResponse}
          streaming={streaming}
          initialValues={initialValues}
          interruptValue={interruptValue}
          onEditChange={onEditChange}
          handleSubmit={handleSubmit}
        />
        {supportsMultipleMethods ? (
          <div className="flex gap-3 items-center mx-auto mt-3">
            <Separator className="w-[full]" />
            <p className="text-sm text-gray-500">Or</p>
            <Separator className="w-full" />
          </div>
        ) : null}
        <Response
          humanResponse={humanResponse}
          streaming={streaming}
          showArgsInResponse={showArgsInResponse}
          interruptValue={interruptValue}
          onResponseChange={onResponseChange}
          handleSubmit={handleSubmit}
        />
        {streaming && <p className="text-sm text-gray-600">Running...</p>}
        {streamFinished && (
          <p className="text-base text-green-600 font-medium">
            Successfully finished Graph invocation.
          </p>
        )}
      </div>
    </div>
  );
}
