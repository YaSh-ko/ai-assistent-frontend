import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiRequest, clearAuthToken, getAuthToken } from "@/lib/api-client";

interface ProtectedRouteProps {
    readonly children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Проверяем наличие токена в localStorage или sessionStorage
                const token = getAuthToken();
                
                if (!token) {
                    setIsAuthenticated(false);
                    return;
                }

                // Проверяем валидность токена через API
                // Используем apiRequest, чтобы передались параметры Basic Auth для прокси,
                // а токен сессии пойдет через cookies.
                const response = await apiRequest('/auth/get-session', {
                    method: "GET"
                });

                if (response.ok) {
                    setIsAuthenticated(true);
                } else {
                    // Токен невалиден, удаляем его
                    clearAuthToken();
                    setIsAuthenticated(false);
                }
            } catch (error) {
                console.error("Auth check failed:", error);
                clearAuthToken();
                setIsAuthenticated(false);
            }
        };

        checkAuth();
    }, []);

    // Показываем загрузку пока проверяем аутентификацию
    if (isAuthenticated === null) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #000019, #000019, #000019)',
                color: '#ffffff'
            }}>
                <div>Загрузка...</div>
            </div>
        );
    }

    // Если не аутентифицирован, редиректим на страницу входа
    if (!isAuthenticated) {
        return <Navigate to="/sign-in" replace />;
    }

    return <>{children}</>;
}
