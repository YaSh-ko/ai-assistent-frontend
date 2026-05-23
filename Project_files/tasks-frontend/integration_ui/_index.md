---
title: "Руководство по интеграции: agent-chat-ui ↔ Python AI Service"
order: 0.5
---

## Обзор

Фронтенд `agent-chat-ui` подключается к бэкенду `python-ai-service` через **LangGraph SDK-совместимый API**. Отдельный LangGraph Server **НЕ требуется** -- бэкенд реализует все необходимые эндпоинты.

## Архитектура деплоя

```
https://delez.tech                     https://api.delez-repo.ru/ai
┌─────────────────┐                    ┌──────────────────────┐
│ Frontend (SPA)  │  ── HTTPS/CORS ──> │ FastAPI (ROOT_PATH=/ai) │
│ agent-chat-ui   │                    │ /api/v1/threads/...  │
│                 │                    │ /api/v1/info         │
└─────────────────┘                    └──────────────────────┘
```

SDK вызывает бэкенд **напрямую** по `https://api.delez-repo.ru/ai/api/v1`. Nginx фронтенда не участвует в этих запросах -- безопасность обеспечивается через CORS.

## Настройка

### 1\. Переменные окружения фронтенда

Файл `frontend/apps/web/.env`:

```env
# URL бэкенда напрямую (CORS)
VITE_API_URL=https://api.delez-repo.ru/ai/api/v1

# ID ассистента
VITE_ASSISTANT_ID=rag_chain

# Не нужен для нашего бэкенда
VITE_LANGSMITH_API_KEY=
```

Или передать через URL:

```
https://delez.tech/?apiUrl=https://api.delez-repo.ru/ai/api/v1&assistantId=rag_chain
```

Или ввести в форме конфигурации UI:

-  **Deployment URL**: `https://api.delez-repo.ru/ai/api/v1`
-  **Assistant ID**: `rag_chain`

### 2\. CORS на бэкенде

В `app/main.py` домен фронтенда уже добавлен в `allow_origins`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://delez.tech",        # ← фронтенд
        "https://delez-repo.ru",
        "http://localhost:5173",      # для локальной разработки
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Маршрутизация запросов

| Что вызывает SDK              | URL запроса                                                    | FastAPI маршрут              |
|-------------------------------|----------------------------------------------------------------|------------------------------|
| `checkGraphStatus()`          | `https://api.delez-repo.ru/ai/api/v1/info`                     | `routes.py → GET /info`      |
| `client.threads.create()`     | `https://api.delez-repo.ru/ai/api/v1/threads`                  | `threads.py → POST /`        |
| `client.threads.search()`     | `https://api.delez-repo.ru/ai/api/v1/threads/search`           | `threads.py → POST /search`  |
| `client.runs.stream()`        | `https://api.delez-repo.ru/ai/api/v1/threads/{id}/runs/stream` | `runs.py → POST /stream`     |
| `client.threads.getHistory()` | `https://api.delez-repo.ru/ai/api/v1/threads/{id}/history`     | `threads.py → POST /history` |

## Проверка подключения

### Проверка бэкенда

```bash
curl https://api.delez-repo.ru/ai/api/v1/info
# → {"version": "0.1.0", "name": "Python AI Service"}
```

### Swagger

```
https://api.delez-repo.ru/ai/docs
```

### Тест SSE-стриминга

```bash
curl -N -X POST https://api.delez-repo.ru/ai/api/v1/threads/test/runs/stream \
  -H "Content-Type: application/json" \
  -d '{"input": {"messages": [{"type": "human", "content": "Привет", "id": "test-1"}]}, "assistant_id": "rag_chain"}'
```

Должны появляться события `event: metadata` и `event: values`.

## Диагностика проблем

| Проблема                                | Причина                           | Решение                                         |
|-----------------------------------------|-----------------------------------|-------------------------------------------------|
| "Failed to connect to LangGraph server" | `/info` не отвечает               | `curl https://api.delez-repo.ru/ai/api/v1/info` |
| CORS ошибка в консоли                   | `delez.tech` не в `allow_origins` | Проверить `main.py`                             |
| 502 Bad Gateway                         | Бэкенд-контейнер не запущен       | `docker-compose up`                             |
| Пустой список тредов                    | Сервер перезапускался             | Нормально, треды in-memory                      |

## Ограничения

-  **In-memory хранение** -- треды теряются при перезапуске бэкенда
-  **user_id** -- захардкожен как `default_user`
-  **ROOT_PATH="/ai"** -- бэкенд смонтирован под `/ai`, все URL начинаются с `https://api.delez-repo.ru/ai/...`