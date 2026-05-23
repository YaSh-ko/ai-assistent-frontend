// Импорт React
import React from "react";

// Импорт провайдера потоков сообщений чата
import { StreamProvider } from "@/providers/Stream";
// Импорт провайдера списка тредов (истории чатов)
import { ThreadProvider } from "@/providers/Thread";
// Импорт основного компонента интерфейса чата
import { Thread } from "@/components/thread";

/**
 * Основной компонент приложения для страницы чата.
 * Оборачивает интерфейс чата провайдерами и рендерит UI Agent Chat.
 */
const App: React.FC = () => {
  return (
    <div className="fixed inset-0 flex flex-col h-[100dvh] overflow-hidden">

      <div className="flex-1 overflow-hidden">
        <ThreadProvider>
          <StreamProvider>
            <Thread />
          </StreamProvider>
        </ThreadProvider>
      </div>
    </div>
  );
};

export default App;
