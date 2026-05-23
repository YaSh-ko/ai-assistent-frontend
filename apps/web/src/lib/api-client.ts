// API клиент для работы с backend
import { logger } from "./logger";

// Вспомогательная функция для декодирования JWT без внешних зависимостей
const decodeJwt = (token: string) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replaceAll('-', '+').replaceAll('_', '/');
        const jsonPayload = decodeURIComponent(globalThis.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.codePointAt(0)!.toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
};

// Получаем токен из localStorage
export const getAuthToken = (): string | null =>
    localStorage.getItem("auth_token");

// Удаляем токен
export const clearAuthToken = (): void => {
    localStorage.removeItem("auth_token");
};

const API_BASE_URL = import.meta.env.PROD ? (import.meta.env.VITE_API_URL ?? "https://api.delez-repo.ru") : "";
const getApiCredentials = () => {
    const username = import.meta.env.VITE_API_USERNAME;
    const password = import.meta.env.VITE_API_PASSWORD;
    
    if (!username || !password) {
        return null;
    }
    
    return { username, password };
};

// Создаем заголовки с авторизацией
// Приоритет: Bearer (сессионный токен) > Basic (API proxy auth)
const createAuthHeaders = (additionalHeaders: Record<string, string> = {}) => {
    try {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...additionalHeaders
        };

        // Если есть сессионный токен — отправляем как Bearer
        // (бэкенд проверяет Bearer первым в get_token_from_request)
        const sessionToken = getAuthToken();
        if (sessionToken) {
            headers["Authorization"] = `Bearer ${sessionToken}`;
            
            // Извлекаем user_id из токена и передаем как кастомный заголовок
            // Это нужно для python-ai-service, чтобы он знал ID пользователя
            const claims = decodeJwt(sessionToken);
            if (claims?.sub) {
                headers["X-User-Id"] = claims.sub;
            }
            
            return headers;
        }

        // Иначе используем Basic Auth для API proxy
        const creds = getApiCredentials();
        if (creds) {
            const credentials = btoa(`${creds.username}:${creds.password}`);
            headers["Authorization"] = `Basic ${credentials}`;
        }

        return headers;
    } catch (error) {
        logger.error('Failed to create auth headers', error);
        return {
            "Content-Type": "application/json",
            ...additionalHeaders
        };
    }
};

// Универсальная функция для API запросов
export const apiRequest = async (
    endpoint: string, 
    options: RequestInit = {}
): Promise<Response> => {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = createAuthHeaders(options.headers as Record<string, string>);
    
    if (!import.meta.env.PROD) {
        let debugBody: unknown = '';
        if (options.body) {
            try {
                debugBody = JSON.parse(options.body as string);
            } catch {
                debugBody = options.body;
            }
        }
        console.log(`[DEBUG] API Request: ${options.method || 'GET'} ${url}`, debugBody);
    }

    const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include"
    });
    
    if (!import.meta.env.PROD) {
        console.log(`[DEBUG] API Response: ${response.status} ${url}`);
    }
    
    // Если сервер вернул 401, удаляем устаревший токен
    if (response.status === 401 && getAuthToken()) {
        logger.debug('Received 401, clearing stale auth token');
        clearAuthToken();
    }
    
    logger.apiResponse(response.status, endpoint);
    return response;
};

const parseResponseData = async (response: Response): Promise<any> => {
    // Tests and some mocked responses expose only json(), while real fetch Response has text().
    if (typeof response.text === "function") {
        const raw = await response.text();
        if (!raw) return {};

        try {
            return JSON.parse(raw);
        } catch {
            return { message: raw };
        }
    }

    if (typeof response.json === "function") {
        try {
            return await response.json();
        } catch {
            return {};
        }
    }

    return {};
};

// Специализированные функции для аутентификации
export interface ProfileData {
    id: string;
    email: string;
    name?: string | null;
    bio?: string | null;
    gender?: "male" | "female" | "other" | null;
    age?: number | null;
    createdAt?: string | null;
}

export interface UpdateProfilePayload {
    name?: string;
    email?: string;
    bio?: string;
    gender?: "male" | "female" | "other" | "";
    age?: number | null;
}

export interface ChangePasswordPayload {
    currentPassword: string;
    newPassword: string;
}

export const authApi = {
    getSession: async () => {
        const response = await apiRequest('/auth/get-session', { method: 'GET' });
        return { response, data: await parseResponseData(response) };
    },

    getProfile: async (): Promise<ProfileData> => {
        const response = await apiRequest('/auth/profile', { method: 'GET' });
        const data = await parseResponseData(response);
        if (response.ok) {
            return data as ProfileData;
        }

        // Compatibility with older deployed backend where /auth/profile is not available yet.
        if (response.status === 404 || response.status === 405) {
            const sessionResponse = await apiRequest('/auth/get-session', { method: 'GET' });
            const sessionData = await parseResponseData(sessionResponse);
            if (!sessionResponse.ok) {
                throw new Error(sessionData?.message || "Не удалось загрузить профиль");
            }

            return {
                id: sessionData?.user?.id ?? "",
                name: sessionData?.user?.name ?? "",
                email: sessionData?.user?.email ?? "",
                bio: "",
                gender: null,
                age: null,
                createdAt: sessionData?.user?.createdAt ?? null,
            };
        }

        throw new Error(data?.message || "Не удалось загрузить профиль");
    },

    updateProfile: async (body: UpdateProfilePayload): Promise<ProfileData> => {
        const response = await apiRequest('/auth/profile', {
            method: 'PATCH',
            body: JSON.stringify(body),
        });
        const data = await parseResponseData(response);
        if ((response.status === 404 || response.status === 405) && !response.ok) {
            throw new Error("Сервер профиля еще не обновлен: сохранение профиля временно недоступно.");
        }
        if (!response.ok) {
            throw new Error(data?.message || "Не удалось обновить профиль");
        }
        return data as ProfileData;
    },

    changePassword: async (payload: ChangePasswordPayload) => {
        const response = await apiRequest('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        const data = await parseResponseData(response);
        if ((response.status === 404 || response.status === 405) && !response.ok) {
            throw new Error("Сервер профиля еще не обновлен: смена пароля из профиля временно недоступна.");
        }
        if (!response.ok) {
            throw new Error(data?.message || "Не удалось изменить пароль");
        }
        return data as { success: boolean; message: string };
    },

    signOut: async () => {
        const response = await apiRequest('/auth/sign-out', { method: 'POST' });
        const data = await parseResponseData(response);
        return { response, data };
    },

    // Проверка существования пользователя
    checkUserExists: async (email: string): Promise<boolean> => {
        try {
            // Способ 1: Прямая проверка через специальный endpoint (если есть)
            try {
                const response = await apiRequest('/users/check', {
                    method: 'POST',
                    body: JSON.stringify({ email })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    return data.exists === true;
                }
            } catch (error) {
                logger.debug('Direct user check endpoint not available', error);
            }
            
            // Способ 2: Попытка сброса пароля (более безопасный подход)
            // Если пользователь существует, сервер отправит письмо (или вернет success)
            // Если не существует, вернет ошибку
            try {
                const resetResponse = await apiRequest('/auth/forgot-password', {
                    method: 'POST',
                    body: JSON.stringify({ 
                        email,
                        // Указываем что это проверка, а не реальный сброс
                        checkOnly: true 
                    })
                });
                
                if (resetResponse.status === 200) {
                    return true; // Пользователь существует
                } else if (resetResponse.status === 404) {
                    return false; // Пользователь не найден
                }
            } catch (resetError) {
                logger.debug('Password reset check not available', resetError);
            }
            
            // Способ 3: Попытка входа с пустым паролем (менее безопасно)
            const loginResponse = await apiRequest('/auth/sign-in', {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    password: '' // Пустой пароль
                })
            });
            
            const loginData = await loginResponse.json();
            
            if (loginResponse.status === 401) {
                // 401 обычно означает неверные credentials, но пользователь существует
                const message = loginData.message || loginData.error || '';
                if (message.toLowerCase().includes('invalid credentials') ||
                    message.toLowerCase().includes('incorrect password') ||
                    message.toLowerCase().includes('wrong password') ||
                    message.toLowerCase().includes('invalid email or password')) {
                    return true; // Пользователь существует
                }
            }
            
            if (loginResponse.status === 404 ||
                loginData.message?.toLowerCase().includes('user not found') ||
                loginData.error?.toLowerCase().includes('user not found')) {
                return false; // Пользователь не найден
            }
            
            // Если не можем определить точно, считаем что пользователь существует
            // (лучше отправить лишнее письмо, чем не отправить нужное)
            return true;
            
        } catch (error) {
            logger.error('Error checking user existence', error);
            // В случае ошибки считаем что пользователь существует
            return true;
        }
    },
    
    // Вход в систему
    signIn: async (email: string, password: string) => {
        const response = await apiRequest('/auth/sign-in/email', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        return { response, data: await parseResponseData(response) };
    },
    
    // Регистрация
    signUp: async (email: string, password: string, name: string) => {
        const response = await apiRequest('/auth/sign-up', {
            method: 'POST',
            body: JSON.stringify({ 
                email: email.trim().toLowerCase(), 
                password, 
                name: name.trim() || "User" 
            })
        });
        
        return { response, data: await response.json() };
    },
    
    // Подтверждение email
    verifyEmail: async (token: string) => {
        const response = await apiRequest('/auth/verify-email', {
            method: 'POST',
            body: JSON.stringify({ token })
        });
        
        return { response, data: await response.json() };
    },
    
    // Повторная отправка письма подтверждения
    resendVerification: async (email: string) => {
        const response = await apiRequest('/auth/resend-verification', {
            method: 'POST',
            body: JSON.stringify({ 
                email: email.trim().toLowerCase(),
                redirectTo: `${globalThis.location.origin}/verify-email`
            })
        });
        
        return { response, data: await response.json() };
    },
    
    // Сброс пароля
    forgotPassword: async (email: string) => {
        const response = await apiRequest('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({
                email,
                redirectTo: `${globalThis.location.origin}/reset-password`
            })
        });
        
        return { response, data: await response.json() };
    },
    
    // Сброс пароля с токеном
    resetPassword: async (token: string, password: string) => {
        const response = await apiRequest('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, password })
        });
        
        return { response, data: await response.json() };
    },

};

// Graph API
export const graphApi = {
    getRhizome: async (params?: { node_types?: string[]; time_period?: string }) => {
        const query = new URLSearchParams();
        if (params?.node_types?.length) {
            params.node_types.forEach(t => query.append('node_types', t));
        }
        if (params?.time_period) query.set('time_period', params.time_period);
        const qs = query.toString() ? `?${query.toString()}` : '';
        const response = await apiRequest(`/v1/graph/rhizome${qs}`);
        if (!response.ok) {
            let detail = `HTTP ${response.status}`;
            try {
                const body = await response.json();
                detail = body?.detail || body?.message || detail;
            } catch { /* ignore parse error */ }
            logger.error(`Graph rhizome error: ${detail}`);
            throw new Error(detail);
        }
        return response.json();
    },

    search: async (query: string, limit = 50) => {
        const response = await apiRequest(`/v1/graph/search?query=${encodeURIComponent(query)}&limit=${limit}`);
        return response.json();
    },

    createRelationship: async (payload: {
        from_type: string;
        from_id: string;
        to_type: string;
        to_id: string;
        relationship: string;
        properties?: Record<string, unknown>;
    }) => {
        const response = await apiRequest('/v1/graph/relationships', {
            method: 'POST',
            body: JSON.stringify({
                ...payload,
                properties: payload.properties ?? {},
            }),
        });

        const data = await parseResponseData(response);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || response.statusText || 'Не удалось создать связь');
        }

        return data;
    },

    deleteRelationship: async (payload: {
        from_id: string;
        to_id: string;
        relationship: string;
    }) => {
        const response = await apiRequest('/v1/graph/relationships', {
            method: 'DELETE',
            body: JSON.stringify(payload),
        });

        const data = await parseResponseData(response);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || response.statusText || 'Не удалось удалить связь');
        }

        return data;
    },
    getRelationshipHistory: async () => {
        const response = await apiRequest('/v1/graph/relationships/history');
        const data = await parseResponseData(response);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || response.statusText || 'Не удалось загрузить историю связей');
        }
        return data as {
            items: Array<{
                audit_id: string;
                from_id: string;
                to_id: string;
                relationship: string;
                action: string;
                changed_by: string;
                changed_at: string;
            }>;
        };
    },
    rollbackRelationship: async (auditId: string) => {
        const response = await apiRequest('/v1/graph/relationships/rollback', {
            method: 'POST',
            body: JSON.stringify({ audit_id: auditId }),
        });
        const data = await parseResponseData(response);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || response.statusText || 'Не удалось откатить изменение связи');
        }
        return data as {
            from_id: string;
            to_id: string;
            relationship: string;
            properties: Record<string, unknown>;
        };
    },
    updateNode: async (nodeType: string, nodeId: string, payload: {
        description?: string;
        image_url?: string;
        title?: string;
    }) => {
        const response = await apiRequest(`/v1/graph/nodes/${encodeURIComponent(nodeType)}/${encodeURIComponent(nodeId)}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        const data = await parseResponseData(response);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || response.statusText || 'Не удалось обновить узел');
        }
        return data as {
            id: string;
            type: string;
            properties: Record<string, unknown>;
        };
    },
};

// Entries API
export const entriesApi = {
    getAll: async (skip = 0, limit = 100) => {
        const response = await apiRequest(`/v1/entries?skip=${skip}&limit=${limit}`);
        return response.json();
    },

    getAnalysis: async (id: string) => {
        const response = await apiRequest(`/v1/entries/${id}/analysis`);
        return response.json();
    },

    getIntensityMetrics: async (id: string) => {
        const response = await apiRequest(`/v1/entries/${id}/intensity-metrics`);
        return response.json();
    },

    getRelatedSituations: async (id: string) => {
        const response = await apiRequest(`/v1/entries/${id}/related-situations`);
        return response.json();
    },

    getNegativeImpacts: async (id: string) => {
        const response = await apiRequest(`/v1/entries/${id}/negative-impacts`);
        return response.json();
    },

    getTransformations: async (id: string) => {
        const response = await apiRequest(`/v1/entries/${id}/transformations`);
        return response.json();
    }
};

function parseFastApiDetail(body: unknown): string {
    if (!body || typeof body !== "object") return "";
    const o = body as { detail?: unknown; message?: string };
    if (typeof o.message === "string" && o.message) return o.message;
    const d = o.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d))
        return d.map((x) => (typeof x === "object" && x && "msg" in x ? String((x as { msg: string }).msg) : JSON.stringify(x))).join("; ");
    return "";
}

// Experiments API (Neo4j + PostgreSQL intensity_metrics)
export const experimentsApi = {
    getById: async (id: string) => {
        const response = await apiRequest(`/v1/experiments/${id}`);
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            const msg = parseFastApiDetail(err) || response.statusText;
            throw new Error(msg || "Запрос не выполнен");
        }
        return response.json();
    },

    getIntensityMetrics: async (id: string, period?: 'week' | 'month' | 'year') => {
        const qs = period ? `?period=${period}` : '';
        const response = await apiRequest(`/v1/experiments/${id}/intensity-metrics${qs}`);
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(parseFastApiDetail(err) || response.statusText);
        }
        return response.json();
    },

    updateExperiment: async (
        id: string,
        body: { status?: string; success?: number; outcome?: string }
    ) => {
        const response = await apiRequest(`/v1/experiments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(parseFastApiDetail(err) || response.statusText);
        }
        return response.json();
    },
};

// Goals API
export const goalsApi = {
    getAll: async () => {
        const response = await apiRequest('/v1/goals');
        return response.json();
    },

    getById: async (id: string) => {
        const response = await apiRequest(`/v1/goals/${id}`);
        return response.json();
    },

    getRelatedEntries: async (id: string) => {
        const response = await apiRequest(`/v1/goals/${id}/related-entries`);
        return response.json();
    },

    getConcepts: async (id: string) => {
        const response = await apiRequest(`/v1/goals/${id}/concepts`);
        return response.json();
    },
};

// Chat API
export const chatApi = {
    getConversations: async (skip = 0, limit = 100) => {
        const response = await apiRequest(`/v1/conversations?skip=${skip}&limit=${limit}`);
        return response.json();
    },
    
    getMessages: async (conversationId: string, skip = 0, limit = 100) => {
        const response = await apiRequest(`/v1/conversations/${conversationId}/messages?skip=${skip}&limit=${limit}`);
        return response.json();
    },

    sendMessage: async (conversationId: string, content: string, role: string = 'user', metaData?: any) => {
        const response = await apiRequest(`/v1/conversations/${conversationId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content, role, meta_data: metaData })
        });
        return response.json();
    },

    addReaction: async (messageId: string, reactionType: string, emoji: string) => {
        const response = await apiRequest(`/v1/messages/${messageId}/reactions`, {
            method: 'POST',
            body: JSON.stringify({ reaction_type: reactionType, emoji })
        });
        return response.json();
    },

    removeReaction: async (messageId: string, reactionType: string): Promise<void> => {
        await apiRequest(`/v1/messages/${encodeURIComponent(messageId)}/reactions/${encodeURIComponent(reactionType)}`, {
            method: 'DELETE',
        });
    },

    getThreadContext: async (threadId: string) => {
        const response = await apiRequest(`/v1/conversations/thread/${threadId}/context`);
        if (!response.ok) return null;
        return response.json();
    },

    deleteLangGraphThread: async (threadId: string): Promise<boolean> => {
        const response = await apiRequest(
            `/ai/api/v1/threads/${encodeURIComponent(threadId)}`,
            { method: "DELETE" },
        );
        return response.ok;
    },

    createCategoryChat: async (category: string): Promise<{ thread_id: string; conversation_id: string }> => {
        const response = await apiRequest('/v1/conversations/category', {
            method: 'POST',
            body: JSON.stringify({ category }),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(parseFastApiDetail(err) || response.statusText);
        }
        return response.json();
    },

    updateThreadTitle: async (threadId: string, title: string): Promise<void> => {
        await apiRequest(`/v1/conversations/thread/${encodeURIComponent(threadId)}/title`, {
            method: 'PATCH',
            body: JSON.stringify({ title }),
        });
    },

    updateThreadCategory: async (threadId: string, category: string): Promise<void> => {
        await apiRequest(`/v1/conversations/thread/${encodeURIComponent(threadId)}/category`, {
            method: 'PATCH',
            body: JSON.stringify({ category }),
        });
    },
};

export default authApi;

// Hints API
export const hintsApi = {
    getSuggestions: async (messages: Array<{ type: string; content: string }>): Promise<string[]> => {
        try {
            const response = await apiRequest('/ai/api/v1/hints', {
                method: 'POST',
                body: JSON.stringify({ messages }),
            });
            if (!response.ok) return [];
            const data = await response.json();
            return Array.isArray(data.hints) ? data.hints : [];
        } catch (error) {
            logger.error('Failed to fetch hints', error);
            return [];
        }
    },
};

export const virtualFieldsApi = {
    getBoard: async (boardId: string) => {
        const response = await apiRequest(`/v1/virtual-fields/board/${encodeURIComponent(boardId)}`);
        const data = await parseResponseData(response);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || response.statusText || 'Не удалось загрузить поле');
        }
        return data as {
            board_id: string;
            payload: {
                nodes: Array<{
                    id: string;
                    parentId: string | null;
                    type: 'question' | 'answer';
                    text: string;
                    x: number;
                    y: number;
                }>;
                branchInputs: Record<string, string>;
            };
        };
    },

    saveBoard: async (payload: {
        board_id: string;
        payload: {
            nodes: Array<{
                id: string;
                parentId: string | null;
                type: 'question' | 'answer';
                text: string;
                x: number;
                y: number;
            }>;
            branchInputs: Record<string, string>;
        };
    }) => {
        const response = await apiRequest('/v1/virtual-fields/board', {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
        const data = await parseResponseData(response);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || response.statusText || 'Не удалось сохранить поле');
        }
        return data;
    },
    getBoardHistory: async (boardId: string) => {
        const response = await apiRequest(`/v1/virtual-fields/board/${encodeURIComponent(boardId)}/history`);
        const data = await parseResponseData(response);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || response.statusText || 'Не удалось загрузить историю поля');
        }
        return data as {
            items: Array<{
                version_id: string;
                board_id: string;
                changed_by: string;
                changed_at: string;
            }>;
        };
    },
    rollbackBoard: async (payload: { board_id: string; version_id: string }) => {
        const response = await apiRequest('/v1/virtual-fields/board/rollback', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        const data = await parseResponseData(response);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || response.statusText || 'Не удалось откатить поле');
        }
        return data as {
            board_id: string;
            payload: {
                nodes: Array<{
                    id: string;
                    parentId: string | null;
                    type: 'question' | 'answer';
                    text: string;
                    x: number;
                    y: number;
                }>;
                branchInputs: Record<string, string>;
            };
        };
    },
};

export const importApi = {
    importMarkdown: async (payload: {
        markdown: string;
        create_entries: boolean;
        create_goals: boolean;
        create_experiments: boolean;
        event_date: string;
    }) => {
        const response = await apiRequest('/v1/import/markdown', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        const data = await parseResponseData(response);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || response.statusText || 'Импорт не выполнен');
        }
        return data as {
            entries_created: number;
            goals_created: number;
            experiments_created: number;
            created_entities: Array<{ id: string; title: string; entity_type: string }>;
        };
    },
};

export const insightsApi = {
    getEntryInsights: async (period: 'day' | 'week' | 'month' | 'year' | 'all') => {
        const response = await apiRequest(`/v1/insights/entries?period=${encodeURIComponent(period)}`);
        const data = await parseResponseData(response);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || response.statusText || 'Не удалось загрузить аналитику');
        }
        return data as {
            period: string;
            total_entries: number;
            active_days: number;
            average_entries_per_active_day: number;
            average_text_length: number;
            strongest_entry_title: string;
            strongest_entry_length: number;
            growth_triggers: Array<{ label: string; count: number }>;
            burnout_triggers: Array<{ label: string; count: number }>;
            repeating_patterns: Array<{ label: string; count: number }>;
        };
    },
};

export const memoirsApi = {
    getPublicFeed: async () => {
        const response = await apiRequest('/v1/memoirs/public');
        const data = await parseResponseData(response);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || response.statusText || 'Не удалось загрузить публичные мемуары');
        }
        return data as {
            items: Array<{
                id: string;
                title: string;
                content: string;
                author_id: string;
                created_at: string;
                likes: number;
            }>;
        };
    },
    createPublicMemoir: async (payload: { title: string; content: string }) => {
        const response = await apiRequest('/v1/memoirs/public', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        const data = await parseResponseData(response);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || response.statusText || 'Не удалось опубликовать мемуар');
        }
        return data as {
            id: string;
            title: string;
            content: string;
            author_id: string;
            created_at: string;
            likes: number;
        };
    },
    likePublicMemoir: async (memoirId: string) => {
        const response = await apiRequest(`/v1/memoirs/public/${encodeURIComponent(memoirId)}/like`, {
            method: 'POST',
        });
        const data = await parseResponseData(response);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || response.statusText || 'Не удалось поставить лайк');
        }
        return data as {
            id: string;
            title: string;
            content: string;
            author_id: string;
            created_at: string;
            likes: number;
        };
    },
    getPrivateStory: async (period: 'month' | 'year' | 'all') => {
        const response = await apiRequest(`/v1/memoirs/private/story?period=${encodeURIComponent(period)}`);
        const data = await parseResponseData(response);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || response.statusText || 'Не удалось собрать приватную историю');
        }
        return data as {
            title: string;
            narrative: string;
            timeline_points: string[];
        };
    },
    getRecommendations: async () => {
        const response = await apiRequest('/v1/memoirs/recommendations');
        const data = await parseResponseData(response);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || response.statusText || 'Не удалось загрузить рекомендации');
        }
        return data as {
            items: Array<{ title: string; description: string }>;
        };
    },
};
