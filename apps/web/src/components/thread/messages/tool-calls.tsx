import { AIMessage, ToolMessage } from "@langchain/langgraph-sdk";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { isComplexValue } from "./utils";

function ToolCallHeader({ name, id }: Readonly<{ name: string; id?: string }>) {
  return (
    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
      <h3 className="font-medium text-gray-900">
        {name}
        {id && (
          <code className="ml-2 text-sm bg-gray-100 px-2 py-1 rounded">
            {id}
          </code>
        )}
      </h3>
    </div>
  );
}

function ToolCallArgsTable({ args }: Readonly<{ args: Record<string, any> }>) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <tbody className="divide-y divide-gray-200">
        {Object.entries(args).map(([key, value]) => (
          <tr key={key}>
            <td className="px-4 py-2 text-sm font-medium text-gray-900 whitespace-nowrap">
              {key}
            </td>
            <td className="px-4 py-2 text-sm text-gray-500">
              {isComplexValue(value) ? (
                <code className="bg-gray-50 rounded px-2 py-1 font-mono text-sm break-all">
                  {JSON.stringify(value, null, 2)}
                </code>
              ) : (
                String(value)
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SingleToolCall({ toolCall }: Readonly<{ toolCall: any }>) {
  const args = toolCall.args as Record<string, any>;
  const hasArgs = Object.keys(args).length > 0;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <ToolCallHeader name={toolCall.name} id={toolCall.id} />
      {hasArgs ? (
        <ToolCallArgsTable args={args} />
      ) : (
        <code className="text-sm block p-3">{"{}"}</code>
      )}
    </div>
  );
}

export function ToolCalls({
  toolCalls,
}: Readonly<{
  toolCalls: AIMessage["tool_calls"];
}>) {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="space-y-4 w-full max-w-4xl">
      {toolCalls.map((tc) => (
        <SingleToolCall key={tc.id || tc.name} toolCall={tc} />
      ))}
    </div>
  );
}

function parseMessageContent(content: string | Record<string, any>): {
  parsedContent: Record<string, any> | string;
  isJsonContent: boolean;
} {
  let parsedContent: Record<string, any> | string;
  let isJsonContent = false;

  try {
    if (typeof content === "string") {
      parsedContent = JSON.parse(content);
      isJsonContent = true;
    } else {
      parsedContent = content;
    }
  } catch {
    parsedContent = content as string;
  }

  return { parsedContent, isJsonContent };
}

function formatContentForDisplay(
  content: Record<string, any> | string,
  isJsonContent: boolean,
  isExpanded: boolean
): {
  displayedContent: string;
  shouldTruncate: boolean;
} {
  let contentStr: string;
  if (isJsonContent) {
    contentStr = JSON.stringify(content, null, 2);
  } else if (typeof content === 'string') {
    contentStr = content;
  } else {
    contentStr = JSON.stringify(content);
  }
  const contentLines = contentStr.split("\n");
  const shouldTruncate = contentLines.length > 4 || contentStr.length > 500;
  
  let displayedContent: string;
  if (shouldTruncate && !isExpanded) {
    displayedContent = contentStr.length > 500
      ? contentStr.slice(0, 500) + "..."
      : contentLines.slice(0, 4).join("\n") + "\n...";
  } else {
    displayedContent = contentStr;
  }

  return { displayedContent, shouldTruncate };
}

function ToolResultHeader({ 
  name, 
  toolCallId 
}: Readonly<{ 
  name?: string; 
  toolCallId?: string; 
}>) {
  return (
    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {name ? (
          <h3 className="font-medium text-gray-900">
            Tool Result:{" "}
            <code className="bg-gray-100 px-2 py-1 rounded">
              {name}
            </code>
          </h3>
        ) : (
          <h3 className="font-medium text-gray-900">Tool Result</h3>
        )}
        {toolCallId && (
          <code className="ml-2 text-sm bg-gray-100 px-2 py-1 rounded">
            {toolCallId}
          </code>
        )}
      </div>
    </div>
  );
}

function JsonContentTable({ 
  parsedContent, 
  isExpanded 
}: Readonly<{ 
  parsedContent: Record<string, any> | string; 
  isExpanded: boolean; 
}>) {
  let items: Array<[string | number, unknown]>;
  
  if (Array.isArray(parsedContent)) {
    const arrayItems = isExpanded ? parsedContent : parsedContent.slice(0, 5);
    items = arrayItems.map((item, index) => [index, item]);
  } else if (parsedContent && typeof parsedContent === 'object') {
    items = Object.entries(parsedContent);
  } else {
    items = [];
  }

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <tbody className="divide-y divide-gray-200">
        {items.map(([key, value]) => (
          <tr key={String(key)}>
            <td className="px-4 py-2 text-sm font-medium text-gray-900 whitespace-nowrap">
              {key}
            </td>
            <td className="px-4 py-2 text-sm text-gray-500">
              {isComplexValue(value) ? (
                <code className="bg-gray-50 rounded px-2 py-1 font-mono text-sm break-all">
                  {JSON.stringify(value, null, 2)}
                </code>
              ) : (
                String(value)
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ExpandButton({ 
  isExpanded, 
  onToggle 
}: Readonly<{ 
  isExpanded: boolean; 
  onToggle: () => void; 
}>) {
  return (
    <motion.button
      onClick={onToggle}
      className="w-full py-2 flex items-center justify-center border-t-[1px] border-gray-200 text-gray-500 hover:text-gray-600 hover:bg-gray-50 transition-all ease-in-out duration-200 cursor-pointer"
      initial={{ scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {isExpanded ? <ChevronUp /> : <ChevronDown />}
    </motion.button>
  );
}

function shouldShowExpandButton(
  shouldTruncate: boolean,
  isJsonContent: boolean,
  parsedContent: Record<string, any> | string
): boolean {
  const hasLongArray = isJsonContent && 
                      Array.isArray(parsedContent) && 
                      parsedContent.length > 5;
  
  return (shouldTruncate && !isJsonContent) || hasLongArray;
}

export function ToolResult({ message }: Readonly<{ message: ToolMessage }>) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { parsedContent, isJsonContent } = parseMessageContent(message.content);
  const { displayedContent, shouldTruncate } = formatContentForDisplay(
    parsedContent,
    isJsonContent,
    isExpanded
  );

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const showExpandButton = shouldShowExpandButton(
    shouldTruncate,
    isJsonContent,
    parsedContent
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <ToolResultHeader name={message.name} toolCallId={message.tool_call_id} />
      <motion.div
        className="min-w-full bg-gray-100"
        initial={false}
        animate={{ height: "auto" }}
        transition={{ duration: 0.3 }}
      >
        <div className="p-3">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isExpanded ? "expanded" : "collapsed"}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {isJsonContent ? (
                <JsonContentTable 
                  parsedContent={parsedContent} 
                  isExpanded={isExpanded} 
                />
              ) : (
                <code className="text-sm block">{displayedContent}</code>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        {showExpandButton && (
          <ExpandButton isExpanded={isExpanded} onToggle={toggleExpanded} />
        )}
      </motion.div>
    </div>
  );
}
