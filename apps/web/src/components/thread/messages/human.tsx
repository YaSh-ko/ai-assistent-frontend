import { useStreamContext } from "@/providers/Stream";
import { Message } from "@langchain/langgraph-sdk";
import { useState, useRef, useEffect } from "react";
import { getContentString } from "../utils";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { BranchSwitcher, CommandBar } from "./shared";

function EditableContent({
  value,
  setValue,
  onSubmit,
}: {
  readonly value: string;
  readonly setValue: React.Dispatch<React.SetStateAction<string>>;
  readonly onSubmit: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      className={cn(
        "px-3 py-2 sm:px-4 sm:py-2 rounded-2xl bg-[#000019] border border-white/20 text-white/90 text-[15px] md:text-[15px] leading-relaxed w-fit min-w-[120px] ml-auto max-w-full sm:max-w-[600px] whitespace-pre-wrap break-words min-h-0 focus-visible:ring-1 focus-visible:ring-white/10",
        "resize-none outline-none shadow-none"
      )}
      autoFocus
    />
  );
}

export function HumanMessage({
  message,
  isLoading,
}: {
  readonly message: Message;
  readonly isLoading: boolean;
}) {
  const thread = useStreamContext();
  const meta = thread.getMessagesMetadata(message);
  const parentCheckpoint = meta?.firstSeenState?.parent_checkpoint;

  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState("");
  const contentString = getContentString(message.content);

  const handleSubmitEdit = () => {
    setIsEditing(false);

    const newMessage: Message = { type: "human", content: value };
    thread.submit(
      { messages: [newMessage] },
      {
        checkpoint: parentCheckpoint,
        streamMode: ["values"],
        optimisticValues: (prev) => {
          const values = meta?.firstSeenState?.values;
          if (!values) return prev;

          return {
            ...values,
            messages: [...(values.messages ?? []), newMessage],
          };
        },
      },
    );
  };

  return (
    <div
      className={cn(
        "flex items-center ml-auto gap-2 group w-full",
        isEditing && "w-full max-w-[600px]",
      )}
    >
      <div className="flex flex-col gap-2 w-full items-end">
        {isEditing ? (
          <EditableContent
            value={value}
            setValue={setValue}
            onSubmit={handleSubmitEdit}
          />
        ) : (
          <p className="px-3 py-2 sm:px-4 sm:py-2 rounded-2xl bg-white/10 border border-white/30 text-white/90 text-[15px] leading-relaxed w-fit ml-auto max-w-full sm:max-w-[600px] whitespace-pre-wrap break-words">
            {contentString}
          </p>
        )}

        <div
          className={cn(
            "flex gap-2 items-center ml-auto transition-opacity mb-1",
            isEditing && "opacity-100",
          )}
        >
          <BranchSwitcher
            branch={meta?.branch}
            branchOptions={meta?.branchOptions}
            onSelect={(branch) => thread.setBranch(branch)}
            isLoading={isLoading}
          />
          <div className="flex items-center gap-2">
            <CommandBar
              isLoading={isLoading}
              content={contentString}
              isEditing={isEditing}
              setIsEditing={(c) => {
                if (c) {
                  setValue(contentString);
                }
                setIsEditing(c);
              }}
              handleSubmitEdit={handleSubmitEdit}
              isHumanMessage={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
