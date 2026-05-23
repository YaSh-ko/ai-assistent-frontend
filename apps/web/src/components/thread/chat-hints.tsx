import { motion, AnimatePresence } from "framer-motion";

interface ChatHintsProps {
  hints: string[];
  isLoading: boolean;
  onSelect: (hint: string) => void;
}

function HintSkeleton() {
  return (
    <div className="flex gap-2 w-full max-w-3xl mx-auto px-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex-1 h-9 rounded-xl bg-white/10 animate-pulse"
        />
      ))}
    </div>
  );
}

/**
 * Ряд кнопок-подсказок под полем ввода чата.
 * Кнопки равномерно занимают всю ширину контейнера.
 */
export function ChatHints({ hints, isLoading, onSelect }: Readonly<ChatHintsProps>) {
  if (isLoading) return <HintSkeleton />;
  if (!hints.length) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={hints.join("|")}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="flex gap-2 w-full max-w-3xl mx-auto px-4"
      >
        {hints.map((hint) => (
          <button
            key={hint}
            type="button"
            onClick={() => onSelect(hint)}
            className="
              flex-1 text-sm text-white/75 border border-white/20 rounded-xl
              px-3 py-2 bg-transparent text-center
              hover:border-white/50 hover:text-white
              active:scale-95
              transition-all duration-200 ease-out
              cursor-pointer outline-none break-words
            "
          >
            {hint}
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
