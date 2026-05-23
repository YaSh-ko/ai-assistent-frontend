import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, CheckCircle } from "lucide-react";
import { validateEmail, mapAuthError } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";
import ParticlesBackground from "@/components/ParticlesBackground";
import "../styles/auth.css";

// В dev режиме запросы идут через Vite proxy (обход CORS)
const API_BASE_URL = import.meta.env.PROD ? "https://api.delez-repo.ru" : "";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Client-side validation
        if (!validateEmail(email)) {
            setError(mapAuthError("Invalid email"));
            return;
        }

        setIsLoading(true);

        try {
            // Отправляем запрос на сброс пароля напрямую
            logger.debug('Sending password reset request', { email: email.trim().toLowerCase() });
            
            // Попробуем разные возможные эндпоинты
            const possibleEndpoints = [
                '/auth/forget-password',
                '/auth/forgot-password', 
                '/auth/password/forgot',
                '/auth/password/reset-request'
            ];
            
            let response;
            
            for (const endpoint of possibleEndpoints) {
                try {
                    logger.debug(`Trying endpoint: ${endpoint}`);
                    response = await fetch(`${API_BASE_URL}${endpoint}`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            email: email.trim().toLowerCase(),
                            redirectTo: `${globalThis.location.origin}/reset-password`
                        }),
                        credentials: "include"
                    });
                    
                    logger.debug(`Endpoint ${endpoint} response status: ${response.status}`);
                    
                    if (response.status !== 404 && response.status !== 405) {
                        // Найден рабочий эндпоинт
                        break;
                    }
                } catch (err) {
                    logger.debug(`Endpoint ${endpoint} failed`, err);
                    continue;
                }
            }
            
            if (!response || response.status === 404 || response.status === 405) {
                throw new Error("Эндпоинт для сброса пароля не найден на сервере");
            }

            logger.apiResponse(response.status, 'reset-password', {
                headers: Object.fromEntries(response.headers.entries())
            });
            
            const data = await response.json();
            logger.debug('Reset password response data', data);

            if (!response.ok) {
                if (response.status === 404) {
                    setError("Пользователь с таким email не найден");
                    return;
                } else if (response.status === 400) {
                    setError("Неверный формат email");
                    return;
                } else if (response.status === 500) {
                    setError("Ошибка сервера при отправке письма. Попробуйте позже");
                    return;
                }
                throw new Error(data.message || data.error || "Ошибка отправки ссылки");
            }

            // Проверяем, что сервер подтвердил отправку
            if (data.success === false) {
            setError("Не удалось отправить письмо. Проверьте email-адрес или попробуйте позже");
                return;
            }

            logger.info('Password reset email sent successfully', { email: email.trim().toLowerCase() });
            setIsSuccess(true);
        } catch (err: any) {
            logger.authError('Password reset failed', err);
            setError(mapAuthError(err?.message || "Неизвестная ошибка"));
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="auth-body">
                <ParticlesBackground />
                <div className="auth-container">
                    <div className="form-box">
                        <div className="success-icon">
                            <CheckCircle size={64} />
                        </div>
                        <h2 className="auth-title">ПИСЬМО ОТПРАВЛЕНО</h2>
                        <p className="auth-subtitle">
                            Мы отправили ссылку для сброса пароля на <span style={{color: '#00d4ff', fontWeight: 'bold'}}>{email}</span>.
                            Проверьте почту и следуйте инструкциям.
                        </p>
                        <div className="success-message">
                            Не получили письмо? Проверьте папку «Спам» или{" "}
                            <button
                                onClick={() => setIsSuccess(false)}
                                style={{color: '#00d4ff', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer'}}
                            >
                                попробуйте снова
                            </button>
                        </div>
                        <div className="auth-link">
                            <Link to="/sign-in">← Ко входу</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-body auth-page">
            <ParticlesBackground />
            <div className="auth-container">
                <div className="form-box">
                    <h2 className="auth-title">ВОССТАНОВЛЕНИЕ ПАРОЛЯ</h2>
                    <p className="auth-subtitle">
                        Введите email-адрес, указанный при регистрации, и мы отправим ссылку для сброса пароля
                    </p>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="input-group">
                            <input
                                id="email"
                                type="email"
                                className="input-field"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                            <label htmlFor="email">Электронная почта</label>
                            <div className="glow-line"></div>
                        </div>

                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        <button type="submit" className="auth-btn" disabled={isLoading}>
                            <div className="btn-glow"></div>
                            <span>{isLoading ? <Loader2 className="animate-spin" size={20} /> : "ОТПРАВИТЬ ССЫЛКУ"}</span>
                        </button>
                    </form>

                    <div className="auth-link">
                        Вспомнили пароль? <Link to="/sign-in">Войти</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
