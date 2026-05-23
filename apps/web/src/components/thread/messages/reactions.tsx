import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipIconButton } from "../tooltip-icon-button";

export interface Reaction {
  id: string;
  type: string;
  emoji: string;
  user_id: string;
  count: number;
  highlighted?: boolean;
}

interface MessageReactionsProps {
  messageId: string;
  initialReactions?: Reaction[];
  className?: string;
  align?: "left" | "right";
}

const AVAILABLE_REACTIONS = [
  { type: "heart", emoji: "❤️" },
  { type: "thumbs_up", emoji: "👍" },
  { type: "fire", emoji: "🔥" },
  { type: "thinking", emoji: "🤔" },
  { type: "smile", emoji: "😊" },
];

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId: _messageId, // Reserved for future use
  initialReactions = [],
  className,
  align = "left",
}) => {
  const [reactions, setReactions] = useState<Reaction[]>(initialReactions);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showPicker) return;

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (pickerRef.current?.contains(target)) return;
      setShowPicker(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [showPicker]);

  // We skip loading from DB purely here unless requested
  // (Assuming websockets / polling will populate initialReactions in future)

  const handleAddReaction = async (type: string, emoji: string) => {
    setShowPicker(false);

    const existing = reactions.find(r => r.type === type);
    const isHighlighted = existing?.highlighted ?? false;

    if (isHighlighted) {
      setReactions(prev =>
        prev
          .map(r => r.type === type ? { ...r, count: r.count - 1, highlighted: false } : r)
          .filter(r => r.count > 0)
      );
    } else if (existing) {
      setReactions(prev => prev.map(r => r.type === type ? { ...r, count: r.count + 1, highlighted: true } : r));
    } else {
      setReactions(prev => [...prev, { id: Date.now().toString(), type, emoji, user_id: "me", count: 1, highlighted: true }]);
    }
  };

  return (
    <div className={cn("relative flex items-center gap-1.5", className, align === "right" ? "justify-end" : "justify-start")}>
      {/* Existing Reactions */}
      <div className="flex flex-wrap gap-1.5">
        <AnimatePresence>
          {reactions.map((reaction) => (
            <motion.button
              key={reaction.type}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleAddReaction(reaction.type, reaction.emoji)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[13px] font-medium border transition-colors cursor-pointer",
                reaction.highlighted
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-transparent border-white/10 text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <span>{reaction.emoji}</span>
              {reaction.count > 1 && <span className="text-[11px] opacity-80">{reaction.count}</span>}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Reaction Button & Picker */}
      <div ref={pickerRef} className="relative">
        <TooltipIconButton
          onClick={() => setShowPicker(!showPicker)}
          variant="ghost"
          tooltip="Add reaction"
          className={cn(
            "text-white hover:bg-transparent hover:text-white",
            showPicker && "bg-white/5"
          )}
          side={align === "right" ? "left" : "right"}
        >
          <SmilePlus className="size-4" />
        </TooltipIconButton>

        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute top-full mt-1.5 flex gap-1 p-1.5 bg-[#1a1a3a]/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl z-20",
                align === "right" ? "right-0" : "left-0"
              )}
            >
              {AVAILABLE_REACTIONS.map((r) => (
                <button
                  key={r.type}
                  onClick={() => handleAddReaction(r.type, r.emoji)}
                  className="p-1.5 rounded-full hover:bg-white/10 hover:scale-125 transition-all outline-none"
                >
                  <span className="text-[16px] leading-[1]">{r.emoji}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
