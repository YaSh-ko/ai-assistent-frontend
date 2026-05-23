---
order: 1
title: Architecture
---

## Оглавление

1. [Введение](#введение)
2. [Общая архитектура](#общая-архитектура)
   -  [Архитектурные слои](#архитектурные-слои)
3. [Структура проекта](#структура-проекта)
   -  [Корневая структура `frontend/`](#корневая-структура-frontend)
   -  [Структура `apps/web/`](#структура-appsweb)
   -  [Структура `src/`](#структура-src)
4. [Routing и страницы](#routing-и-страницы)
   -  [`main.tsx` и маршрутизация](#maintsx-и-маршрутизация)
   -  [Страница чата `/chat`](#страница-чата-chat)
   -  [Страница графа `/graph`](#страница-графа-graph)
5. [Слой провайдеров и состояние](#слой-провайдеров-и-состояние)
   -  [`StreamProvider`](#streamprovider)
   -  [`ThreadProvider`](#threadprovider)
   -  Управление параметрами URL и localStorage
6. [Компоненты чата](#компоненты-чата)
   -  [`Thread` -- основной layout чата](#thread--основной-layout-чата)
   -  История тредов (`ThreadHistory`)
   -  Сообщения (`HumanMessage`, `AssistantMessage`, tool calls)
   -  Agent Inbox interrupts
   -  Рендер Markdown и кода
7. [UI‑кит и утилиты](#ui-кит-и-утилиты)
8. [Интеграция с LangGraph Server / backend](#интеграция-с-langgraph-server--backend)
   -  Конфигурация API URL, Assistant ID и API Key
   -  Работа с потоками и тредами
9. [Технологический стек](#технологический-стек-frontend)
10. [Паттерны и принципы](#паттерны-и-принципы-frontend)
11. [Расширяемость фронтенда](#расширяемость-фронтенда)
12. [Заключение](#заключение-frontend)

## Введение

Данный документ описывает архитектуру фронтенд‑части **Agent Chat UI** в папке `frontend/`.\
Это SPA на базе **React 19 + Vite**, предназначенное для:

-  визуализации диалога с агентом LangGraph (чат, история тредов, tool calls, interrupts);
-  подключения к backend‑сервису, реализующему LangGraph Server API (см. `Architecture.md` для python‑backend);
-  отображения 3D‑графа (демо‑визуализация, используемая как пример графового интерфейса).

Фронтенд спроектирован как тонкий клиент поверх LangGraph SDK: бизнес‑логика графа живёт в backend, а UI отвечает за:

-  маршрутизацию;
-  управление локальным состоянием (контексты чата и истории);
-  удобный рендер сообщений и инструментов;
-  интерактивные визуализации.

## Общая архитектура

Фронтенд следует упрощённой слоистой архитектуре:

| Слой                  | Описание                                                               |
|-----------------------|------------------------------------------------------------------------|
| Routing Layer         | Маршруты `/chat` и `/graph` через `react-router-dom`                   |
| App / Pages Layer     | Страницы `App` (чат) и `GraphPage` (3D‑граф)                           |
| Providers Layer       | Контексты `StreamProvider`, `ThreadProvider` вокруг дерева компонентов |
| UI / Components Layer | Презентационные компоненты чата и UI‑кит поверх Tailwind + Radix       |
| Lib / Utils Layer     | Утилиты, работа с API‑ключами, tool‑calls, markdown, хуки              |
| Integration Layer     | Подключение к LangGraph Server через SDK и streaming API               |

### Архитектурные слои

1. **Routing Layer**

   -  Отвечает за URL‑маршруты и синхронизацию состояния с query‑параметрами.
   -  Используются `BrowserRouter`, `Routes`, `Route`, `Navigate` из `react-router-dom`.
   -  Библиотека `nuqs` даёт типобезопасный доступ к query‑параметрам (например, `threadId`, `apiUrl`, `assistantId`, `chatHistoryOpen`, `hideToolCalls`).

2. **Providers Layer**

   -  `StreamProvider` создаёт и настраивает поток общения с LangGraph сервером (`useStream` из `@langchain/langgraph-sdk/react`).
   -  `ThreadProvider` инкапсулирует работу с тредами (поиск, загрузка, кеш в памяти).
   -  Оба провайдера используют контексты React для проброса состояния вглубь дерева.

3. **UI / Components Layer**

   -  Основной чат‑layout (`Thread`) и набор подкомпонентов (`history`, `messages`, `agent-inbox`, markdown‑рендер и т.д.).
   -  Библиотека UI‑компонентов в `components/ui` построена на Radix UI + Tailwind и предоставляет кнопки, инпуты, tooltip‑ы, диалоги, переключатели, и т.п.

4. **Lib / Utils Layer**

   -  Утилиты `cn`, работа с API‑ключом (`getApiKey`), обеспечение корректности tool‑calls (`ensureToolCallsHaveResponses`).
   -  Вспомогательные функции для парсинга контента сообщений, проверки схем interrupts и др.

5. **Integration Layer**

   -  Тонкие обёртки вокруг `@langchain/langgraph-sdk` (см. `providers/client.ts`, `providers/Stream.tsx`, `providers/Thread.tsx`).
   -  Реализация потокового взаимодействия (streaming), работы с тредами, ветвления (`branches`) и interrupts, полностью привязанная к API LangGraph Server.

## Структура проекта

### Корневая структура `frontend/`

Фактическая структура:

```text
frontend/
├── apps/               # Workspaces (на текущий момент — web)
├── node_modules/
├── package.json        # Корневой package + workspaces
├── package-lock.json
├── tsconfig.json       # Общий TS‑конфиг для монорепы
├── turbo.json          # Turbo tasks (build/lint/dev)
├── langgraph.json      # Конфиг для LangGraph CLI/SDK
└── README.md
```

Ключевые моменты:

-  Используется **npm workspaces**: `workspaces: ["apps/*"]`.
-  Turbo управляет командами `build`, `lint`, `format`, `dev` для подпроектов.
-  `langgraph.json` задаёт:
   -  `node_version` -- версия Node;
   -  `dependencies` -- зависимость на текущий пакет;
   -  `env` -- путь до `.env`, который использует LangGraph CLI.

### Структура `apps/web/`

`apps/web` -- основное фронтенд‑приложение:

```text
apps/web/
├── public/             # Статические ассеты (logo.svg и др.)
├── src/                # Исходный код приложения
├── index.html          # HTML‑шаблон Vite
├── package.json        # Зависимости web‑приложения
├── tsconfig.json       # TS project references (app + node)
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts      # Конфиг Vite (React + Tailwind)
├── turbo.json          # Локальные таски Turbo
└── README.md
```

`package.json` `web` тянет:

-  LangGraph/ LangChain: `@langchain/core`, `@langchain/langgraph`, `@langchain/langgraph-sdk`, `@langchain/langgraph-api`, `@langchain/langgraph-cli`;
-  UI‑стек: `react`, `react-dom`, `tailwindcss`, Radix UI (`@radix-ui/react-*`), `lucide-react`, `sonner`;
-  роутинг и состояние: `react-router-dom`, `nuqs`;
-  визуализации: `react-force-graph-3d`, `recharts`, `framer-motion`;
-  markdown/latex: `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`, `react-syntax-highlighter`, `katex`.

### Структура `src/`

Фактическая структура (упрощённо):

```text
src/
├── main.tsx            # Точка входа, Router
├── App.tsx             # Страница чата /chat
├── index.css           # Tailwind + глобальные стили
├── App.css
├── pages/
│   └── GraphPage.tsx   # Страница 3D‑графа /graph
├── providers/
│   ├── client.ts       # Фабрика LangGraph Client
│   ├── Stream.tsx      # StreamProvider (useStream + форма конфигурации)
│   └── Thread.tsx      # ThreadProvider (поиск и кеш тредов)
├── components/
│   ├── ui/             # Базовые UI компоненты (Button, Input, Sheet, Switch, ...)
│   ├── thread/         # Чат‑интерфейс (Thread, history, messages, agent-inbox и т.д.)
│   └── icons/          # SVG‑иконки (LangGraphLogoSVG)
├── hooks/
│   └── useMediaQuery.tsx
├── lib/
│   ├── utils.ts        # `cn` и др. утилиты
│   ├── api-key.tsx     # Работа с API‑ключом в localStorage
│   ├── ensure-tool-responses.ts # Обеспечение ToolMessage для tool_calls
│   └── agent-inbox-interrupt.ts # Проверка схемы HumanInterrupt
└── vite-env.d.ts
```

## Routing и страницы

### `main.tsx` и маршрутизация

В `src/main.tsx`:

-  создаётся корневой React‑рендер (`ReactDOM.createRoot`);
-  включается `BrowserRouter` из `react-router-dom`;
-  подключается `NuqsAdapter` для интеграции `nuqs` (hook `useQueryState`) с React Router;
-  объявляются маршруты:
   -  `/` -> редирект на `/chat`;
   -  `/chat` -> компонент `App`;
   -  `/graph` -> компонент `GraphPage`.

Таким образом, фронтенд -- это SPA с двумя основными страницами: чат и визуализация графа.

### Страница чата `/chat`

`App.tsx` -- лёгкий композиционный компонент:

-  оборачивает всё дерево чата в:
   -  `ThreadProvider` (управление списком тредов);
   -  `StreamProvider` (подключение к LangGraph streaming API);
-  рендерит основной компонент чата `Thread` из `components/thread`.

Вся логика работы с backend и многократного использования SDK вынесена в провайдеры, а `Thread` остаётся UI‑ориентированным.

### Страница графа `/graph`

`pages/GraphPage.tsx`:

-  с помощью `useEffect` асинхронно загружает JSON‑данные графа (демо‑датасет с GitHub);
-  хранит данные в `useState` в виде `{ nodes: any[]; links: any[] }`;
-  пока данные загружаются -- отображает простой лоадер `"Загрузка графа..."`;
-  рендерит `ForceGraph3D` (из `react-force-graph-3d`) с:
   -  `nodeLabel` (HTML‑строка с пользователем и описанием);
   -  `nodeAutoColorBy="user"` для автоколоринга;
   -  `linkDirectionalParticles` для визуализации направленности.

Эта страница сейчас независима от LangGraph Server и служит как пример/плейграунд 3D‑визуализации.

## Слой провайдеров и состояние

### `StreamProvider`

Файл: `src/providers/Stream.tsx`.

Отвечает за:

-  создание потоковой сессии `useStream` из `@langchain/langgraph-sdk/react` с типизированным состоянием:
   -  `StateType = { messages: Message[]; ui?: UIMessage[] }`;
-  обработку кастомных UI‑событий (`onCustomEvent`) через `uiMessageReducer` (из `@langchain/langgraph-sdk/react-ui`);
-  реакцию на смену `threadId` через `onThreadId`:
   -  обновляет query‑параметр `threadId` через `useQueryState`;
   -  с задержкой вызывает `getThreads()` и обновляет список тредов в `ThreadProvider`;
-  проверку доступности LangGraph сервера (`/info`) и отображение ошибок через `toast` (`sonner`).

Конфигурация:

-  Используются env‑переменные:
   -  `VITE_API_URL` -- базовый URL LangGraph Server;
   -  `VITE_ASSISTANT_ID` -- ID ассистента/графа;
   -  `VITE_LANGSMITH_API_KEY` -- API‑ключ (при необходимости).
-  Значения могут переопределяться через query‑параметры:
   -  `apiUrl`, `assistantId`;
-  API‑ключ хранится в `localStorage` под ключом `lg:chat:apiKey` (см. `lib/api-key.tsx`).

UX‑логика:

-  Если нет `apiUrl` или `assistantId` -- рендерится форма конфигурации:
   -  поля Deployment URL, Assistant / Graph ID и LangSmith API Key;
   -  по `submit` значения сохраняются в URL и `localStorage`, после чего создаётся потоковая сессия.

### `ThreadProvider`

Файл: `src/providers/Thread.tsx`.

Задачи:

-  создавать `LangGraph Client` через `createClient(apiUrl, apiKey)` (см. `providers/client.ts`);
-  предоставлять функции и состояние:
   -  `getThreads(): Promise<Thread[]>` -- поиск тредов через `client.threads.search`;
   -  `threads` / `setThreads` -- массив тредов в памяти;
   -  `threadsLoading` / `setThreadsLoading` -- индикатор загрузки.

Поисковый запрос использует `metadata`, формируемый из `assistantId`:

-  если `assistantId` -- UUID, используется `assistant_id`;
-  иначе -- `graph_id`.

Пара `apiUrl` и `assistantId` читается из query‑параметров через `useQueryState`.\
Контекст доступен через хук `useThreads()`, который гарантирует использование только внутри `ThreadProvider`.

### Управление параметрами URL и localStorage

Критичные состояния выносятся в:

-  **URL query‑параметры** (`nuqs`):
   -  `threadId` -- текущий активный тред;
   -  `apiUrl`, `assistantId` -- конфигурация подключения к серверу;
   -  `chatHistoryOpen` -- видимость панели истории тредов;
   -  `hideToolCalls` -- скрывать/показывать tool‑сообщения.
-  **localStorage**:
   -  `lg:chat:apiKey` -- API‑ключ к LangSmith / LangGraph.

Такой подход:

-  позволяет шарить ссылку с текущей конфигурацией и выбранным тредом;
-  сохраняет конфигурацию между сессиями;
-  делает UI более дебажным и предсказуемым.

## Компоненты чата

### `Thread` -- основной layout чата

Файл: `src/components/thread/index.tsx`.

Ответственности:

-  рендер основной двухпанельной раскладки:
   -  слева -- `ThreadHistory` (панель истории тредов) с анимацией через `framer-motion`;
   -  справа -- основная область сообщений и форма ввода;
-  обработка:
   -  отправки сообщений (`handleSubmit`):
      -  генерирует `human`‑сообщение (uuidv4);
      -  гарантирует наличие `ToolMessage` для `tool_calls` через `ensureToolCallsHaveResponses`;
      -  вызывает `stream.submit` с `streamMode: ["values"]` и optimistic UI;
   -  регенерации ответа (`handleRegenerate`):
      -  повторно вызывает `stream.submit` с `checkpoint`, чтобы переиграть ветку;
   -  отображения ошибок `stream.error` через `toast`;
   -  состояния "первый токен получен" для отображения loader‑компонента.

UI‑особенности:

-  адаптивная верстка (hook `useMediaQuery("(min-width: 1024px)")`);
-  автоматическая прокрутка к низу через `use-stick-to-bottom`;
-  кнопка Scroll to bottom;
-  переключатель `Hide Tool Calls` (управляет фильтрацией tool‑сообщений);
-  кнопка Stop/Cancel остановки генерации (`stream.stop()`).

### История тредов (`ThreadHistory`)

Файл: `src/components/thread/history/index.tsx`.

Задачи:

-  загрузка списка тредов при монтировании:
   -  вызывает `getThreads()` из `useThreads`;
   -  управляет `threadsLoading` и `threads`;
-  отображение списка тредов (`ThreadList`):
   -  для каждого треда использует либо `thread_id`, либо первый текст сообщения (`getContentString`);
   -  по клику выставляет `threadId` в query‑параметры;
-  адаптивное поведение:
   -  на больших экранах -- фиксированная левая панель;
   -  на малых -- выдвижная `Sheet` (Radix UI) с контролем `chatHistoryOpen`.

### Сообщения (`HumanMessage`, `AssistantMessage`, tool calls)

Основные файлы:

-  `components/thread/messages/human.tsx`:

   -  отображение пользовательского сообщения;
   -  опциональное редактирование:
      -  `isEditing` / `setIsEditing`;
      -  отправка отредактированного варианта как нового `human`‑сообщения с использованием `checkpoint` (`meta.firstSeenState.parent_checkpoint`);
   -  `CommandBar` даёт кнопки Copy / Edit / Submit.

-  `components/thread/messages/ai.tsx`:

   -  отображение AI‑сообщения:
      -  текстовая часть через `MarkdownText` (поддержка Markdown + таблиц + LaTeX);
      -  tool‑вызовы:
         -  работает как с `message.tool_calls`, так и с anthropic‑стилем `MessageContentComplex` (парсер `parseAnthropicStreamedToolCalls`);
         -  выводит таблицу аргументов (`ToolCalls`);
      -  кастомные UI‑блоки из `values.ui` через `LoadExternalComponent`;
   -  рендер interrupts:
      -  если `thread.interrupt` соответствует схеме Agent Inbox (`isAgentInboxInterruptSchema`) -- отображает `ThreadView` (agent-inbox UI);
      -  иначе -- `GenericInterruptView`.

-  `components/thread/messages/tool-calls.tsx`:

   -  детальный табличный вывод tool‑аргументов;
   -  `ToolResult` для отображения `ToolMessage`:
      -  пытается парсить JSON;
      -  при больших объёмах данных -- сворачивание/разворачивание с анимацией (`AnimatePresence`).

### Agent Inbox interrupts

Файлы:

-  `lib/agent-inbox-interrupt.ts` -- проверка, что interrupt имеет форму `HumanInterrupt` (или массива), включая проверки `config.allow_respond/accept/edit/ignore`.
-  `components/thread/agent-inbox` -- UI для работы с такими interrupts:
   -  `ThreadView` выбирает между `StateView` и `ThreadActionsView` в зависимости от локального состояния (`showDescription` / `showState`);
   -  передаёт `values` из `useStreamContext` для отображения текущего состояния графа.

Этот блок делает поддержку LangGraph prebuilt Agent Inbox более "нативной" в UI и позволяет визуализировать сложные промежуточные состояния.

### Рендер Markdown и подсветка кода

Файлы:

-  `components/thread/markdown-text.tsx`:

   -  обёртка над `react-markdown` с плагинами:
      -  `remark-gfm` (таблицы, чекбоксы, ссылки);
      -  `remark-math` + `rehype-katex` (формулы);
   -  собственный набор компонентов (`h1`–`h6`, `p`, `ul/ol`, `table`, `blockquote`, `code`) с Tailwind‑классами;
   -  специальная обработка `code`:
      -  для блоков ```` ```language ```` рендерит заголовок с кнопкой Copy и подсветку (`SyntaxHighlighter`);
      -  для inline‑кода использует стилизованный `<code>`.

-  `components/thread/syntax-highlighter.tsx`:

   -  `PrismAsyncLight` из `react-syntax-highlighter`;
   -  регистрирует языки: `js`, `jsx`, `ts`, `tsx`, `python`;
   -  использует тему `coldarkDark` и кастомные стили под тёмный фон кода.

## UI‑кит и утилиты

### UI‑кит (`components/ui`)

Примеры:

-  `button.tsx`:

   -  использует `class-variance-authority` (`cva`) для описания вариантов (`variant`, `size`);
   -  поддерживает варианты: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`, `brand`;
   -  sizes: `default`, `sm`, `lg`, `icon`;
   -  проп `asChild` позволяет использовать `Slot` из Radix для композиции.

-  `input.tsx`, `textarea.tsx`, `switch.tsx`, `sheet.tsx`, `tooltip.tsx`, `avatar.tsx`, `label.tsx`, `password-input.tsx`, `sonner.tsx`, `skeleton.tsx` и др.:

   -  thin‑wrappers вокруг Radix UI и стандартных элементов;
   -  единый визуальный язык, удобный для быстрой сборки новых экранов.

### Утилиты (`lib`, `hooks`)

-  `lib/utils.ts`:

   -  `cn(...inputs)` -- обёртка над `clsx` + `tailwind-merge` для корректного слияния классов.

-  `lib/api-key.tsx`:

   -  безопасно получает API‑ключ из `localStorage` (`try/catch`, проверка `typeof window`).

-  `lib/ensure-tool-responses.ts`:

   -  проходит по списку сообщений;
   -  для каждого `AI`‑сообщения с `tool_calls` проверяет, что следующее сообщение -- `ToolMessage`;
   -  если нет -- добавляет synthetic `ToolMessage` с ID, начинающимся с `DO_NOT_RENDER_ID_PREFIX`, и текстом `"Successfully handled tool call."`.
   -  Это гарантирует консистентность потока сообщений для UI/SDK.

-  `hooks/useMediaQuery.tsx`:

   -  простой хук над `window.matchMedia` для адаптивного поведения компонентов.

## Интеграция с LangGraph Server / backend

### Конфигурация API URL, Assistant ID и API Key

Фронтенд ожидает запущенный LangGraph Server (см. backend‑документацию):

-  по умолчанию:
   -  `DEFAULT_API_URL = "http://localhost:2024"`;
   -  `DEFAULT_ASSISTANT_ID = "agent"`;
-  может быть перенастроен через:
   -  env‑переменные Vite (`import.meta.env.VITE_API_URL`, `VITE_ASSISTANT_ID`, `VITE_LANGSMITH_API_KEY`);
   -  query‑параметры URL (`apiUrl`, `assistantId`);
   -  форму конфигурации в UI.

API‑ключ хранится:

-  в `localStorage` (`lg:chat:apiKey`);
-  читается утилитой `getApiKey()` и используется при создании `Client` и в `useStream` (`apiKey`).

### Работа с потоками и тредами

Основные точки интеграции:

-  `providers/client.ts`:

   -  `createClient(apiUrl, apiKey)` создаёт инстанс `Client` из `@langchain/langgraph-sdk`.

-  `providers/Stream.tsx`:

   -  `useStream` подключается к LangGraph Server:
      -  `assistantId` = ID графа / ассистента;
      -  `threadId` -- текущий тред;
      -  `onCustomEvent`, `onThreadId`, `values`, `messages`, `interrupt`, `setBranch`, `submit`, `stop`.

-  `providers/Thread.tsx`:

   -  использует `client.threads.search` для загрузки списка тредов по `metadata` (assistant/graph id);
   -  возвращает `Thread[]`, используемые в `ThreadHistory`.

С точки зрения архитектуры:

-  фронтенд **не знает** ни о содержимом графа, ни о конкретных нодах;
-  он работает только с абстракциями LangGraph SDK:
   -  `Message`, `Checkpoint`, `Thread`, `HumanInterrupt`, `values`, `ui` и т.д.;
-  backend (python‑ai‑service) реализует LangGraph Server API и отвечает за:
   -  hybrid search, reasoning, caching, выбор моделей и остальную бизнес‑логику.

## Технологический стек (frontend)

| Технология                     | Назначение                                  |
|--------------------------------|---------------------------------------------|
| React 19                       | Основной UI‑фреймворк                       |
| Vite 6                         | Бандлер/дев‑сервер                          |
| TypeScript 5                   | Статическая типизация                       |
| React Router DOM               | Маршрутизация                               |
| nuqs                           | Работа с query‑параметрами как с состоянием |
| Tailwind CSS 4                 | Утилитарная система стилей                  |
| Radix UI                       | Базовые headless‑компоненты UI              |
| Lucide React                   | Иконки                                      |
| Sonner                         | Toast‑уведомления                           |
| @langchain/langgraph-sdk       | Клиент LangGraph Server                     |
| @langchain/langgraph/react-ui  | Вспомогательные UI‑редьюсеры и компоненты   |
| React Markdown + remark/rehype | Рендер markdown + GFM + LaTeX               |
| React Syntax Highlighter       | Подсветка кода в сообщениях                 |
| React Force Graph 3D + three   | 3D‑визуализация графа                       |
| Framer Motion                  | Анимации                                    |

## Паттерны и принципы (frontend)

-  **Container / Presentational**:

   -  провайдеры (`StreamProvider`, `ThreadProvider`) и хуки инкапсулируют работу с SDK;
   -  компоненты (`Thread`, `ThreadHistory`, `HumanMessage`, `AssistantMessage`) фокусируются на рендере.

-  **Context + Hooks**:

   -  доступ к состоянию чата/тредов только через `useStreamContext()` и `useThreads()`;
   -  упрощает использование в любых глубоко вложенных компонентах.

-  **URL‑driven state**:

   -  `threadId`, `apiUrl`, `assistantId`, флаги UI привязаны к URL;
   -  поведение приложения детерминировано ссылкой.

-  **Optimistic UI**:

   -  `stream.submit` вызывается с `optimisticValues`, чтобы сообщения появлялись в ленте до ответа сервера.

-  **Separation of concerns**:

   -  работа с локальным storage (`getApiKey`) вынесена в `lib`;
   -  утилиты форматирования/парсинга (`getContentString`, `ensureToolCallsHaveResponses`) изолированы от компонентов.

## Расширяемость фронтенда

### Добавление новой страницы

1. Создать компонент в `src/pages/` (например, `SettingsPage.tsx`).
2. Добавить маршрут в `main.tsx` через `Route path="/settings"`.
3. При необходимости использовать существующие провайдеры/хуки (`StreamProvider`, `useThreads`, `useStreamContext`).

### Добавление новых типов сообщений / UI

1. При появлении новых типов сообщений в LangGraph:
   -  расширить `AssistantMessage` / `HumanMessage` или добавить новый компонент.
2. Для кастомного UI на стороне графа:
   -  использовать `values.ui` и `LoadExternalComponent` (уже интегрировано);
   -  фильтровать/маппить по `metadata.message_id`.

### Расширение работы с графом

-  Текущий `GraphPage` использует внешний JSON‑датасет.\
   Для интеграции с backend:
   -  заменить `fetch` на вызов собственного API (например, `GET /graph/data` на python‑ai‑service);
   -  типизировать ноды/ребра;
   -  добавить UI для выбора ассистента/цепочки, фильтрации и т.д.

## Заключение (frontend)

Фронтенд‑архитектура построена вокруг LangGraph SDK и чётко разделяет слои маршрутизации, провайдеров состояния, UI‑компонентов и утилит.\
Приложение остаётся тонким клиентом над LangGraph Server: все сложные части reasoning, поиска и orchestration вынесены в backend, а UI сфокусирован на удобной и расширяемой визуализации диалогов и состояний графа.\
Благодаря использованию контекстов, URL‑управляемого состояния и модульного UI‑кита добавление новых страниц, визуализаций и типов сообщений не требует изменения существующей логики и хорошо масштабируется.