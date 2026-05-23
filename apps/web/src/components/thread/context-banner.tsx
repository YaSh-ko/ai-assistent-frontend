import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, Users, MonitorPlay, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Моковый контекст данных
// В реальном приложении он придет из `conversations.entry_threads`
export interface ThreadContext {
  id?: string;
  type: "hackathon" | "event" | "meeting" | "general";
  title: string;
  description?: string;
}

interface ContextBannerProps {
  context?: ThreadContext | null;
  onDismiss?: () => void;
  className?: string;
}

export const ContextBanner: React.FC<ContextBannerProps> = ({
  context,
  onDismiss,
  className,
}) => {
  return (
    <AnimatePresence>
      {context && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "relative flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-3.5 mx-4 mt-2 mb-4",
            "bg-white/5 border border-white/10 rounded-2xl shadow-xl backdrop-blur-md overflow-hidden",
            "group transition-all hover:bg-white/10",
            className
          )}
        >
          {/* Декоративный градиентный фон */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-transparent opacity-50 pointer-events-none" />

          {/* Иконка */}
          <div className="flex-shrink-0 flex items-center justify-center size-10 rounded-full bg-white/10 border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-300">
            {context.type === "hackathon" && <MonitorPlay className="size-5 text-blue-300" />}
            {context.type === "meeting" && <Users className="size-5 text-purple-300" />}
            {(context.type === "event" || context.type === "general") && (
              <Info className="size-5 text-indigo-300" />
            )}
          </div>

          {/* Текст */}
          <div className="flex-1 min-w-0 pr-6 relative z-10">
            <h4 className="text-[14px] sm:text-[15px] font-medium text-white/90 truncate tracking-wide">
              {context.title}
            </h4>
            {context.description && (
              <p className="text-[12px] sm:text-[13px] text-white/60 truncate mt-0.5 font-light">
                {context.description}
              </p>
            )}
          </div>

          {/* Кнопка закрытия */}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
              title="Скрыть контекст"
            >
              <X className="size-4" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
