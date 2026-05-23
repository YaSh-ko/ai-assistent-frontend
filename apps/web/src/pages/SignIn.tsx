import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { validateEmail } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";
import authApi from "@/lib/api-client";
import ParticlesBackground from "@/components/ParticlesBackground";
import PasswordToggleButton from "@/components/PasswordToggleButton";
import "../styles/auth.css";



// CSS для screen reader only текста
const srOnlyStyle = {
    position: 'absolute' as const,
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap' as const,
    border: '0'
};

export default function SignIn() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        logger.debug('Attempting sign in', { email, emailLength: email.length });

        // Client-side validation
        const isEmailValid = validateEmail(email);
        logger.debug('Email validation result', { isValid: isEmailValid });

        if (!isEmailValid) {
            logger.warn('Email validation failed', { email });
            setError("Некорректный формат email-адреса");
            return;
        }
        if (!password) {
            setError("Введите пароль");
            return;
        }

        setIsLoading(true);

        try {
            const requestBody = {
                email: email.trim().toLowerCase(),
                password
            };

            const { response, data } = await authApi.signIn(requestBody.email, requestBody.password);
            
            logger.debug('Sign in response data', data);

            if (!response.ok) {
                await handleSignInError(response, data);
                return;
            }

            // Store session token if provided
            if (data.session?.token) {
                localStorage.setItem("auth_token", data.session.token);
            }

            logger.authEvent('User signed in successfully', { email: requestBody.email });
            navigate("/navigation");
        } catch (err: any) {
            logger.authError('Sign in failed', err);
            setError(err?.message || "Не удалось выполнить вход. Попробуйте ещё раз.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignInError = async (response: Response, data: any) => {
        const message = data.message || data.error || '';

        // Ошибка сервера (500) — проблема на стороне бэкенда
        if (response.status === 500) {
            logger.error('Server error during sign in', { status: 500, message });
            throw new Error("Ошибка сервера. Пожалуйста, попробуйте позже или обратитесь в поддержку.");
        }

        if (response.status === 401) {
            if (message.toLowerCase().includes('user not found')) {
                throw new Error("Пользователь с таким email-адресом не найден");
            }

            if (message.toLowerCase().includes('email not verified') || message.toLowerCase().includes('не подтвержден')) {
                navigate("/verify-email", {
                    state: { email: email.trim().toLowerCase() }
                });
                return;
            }

            throw new Error("Неверный email-адрес или пароль");
        }

        // Handle unverified email error (status 400)
        if (response.status === 400) {
            if (message.toLowerCase().includes('не подтвержден') || message.toLowerCase().includes('email')) {
                throw new Error(message);
            }
            throw new Error(message || "Неверный формат данных");
        }

        const hasVerifyMessage = message.toLowerCase().includes('verify') || message.toLowerCase().includes('подтвер');
        if (response.status === 403 && hasVerifyMessage) {
            navigate("/verify-email", {
                state: { email: email.trim().toLowerCase() }
            });
            return;
        }

        throw new Error(message || "Ошибка входа");
    };

    return (
        <div className="auth-body auth-page">
            <ParticlesBackground />
            <div className="auth-container">
                <div className="form-box">
                    <h2 className="auth-title">С ВОЗВРАЩЕНИЕМ</h2>
                    <p className="auth-subtitle">Войдите в аккаунт, чтобы продолжить путь</p>

                    <form className="auth-form" onSubmit={handleSignIn}>
                        <div className="input-group">
                            <input
                                id="signin-email"
                                type="text"
                                className="input-field"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                aria-describedby={error ? "signin-error" : undefined}
                            />
                            <label htmlFor="signin-email">Электронная почта</label>
                            <div className="glow-line"></div>
                        </div>

                        <div className="input-group" style={{ position: 'relative' }}>
                            <input
                                id="signin-password"
                                type={showPassword ? "text" : "password"}
                                className="input-field"
                                style={{ paddingRight: '40px' }}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                aria-describedby={error ? "signin-error" : undefined}
                            />
                            <label htmlFor="signin-password">Пароль</label>
                            <PasswordToggleButton show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                            <div className="glow-line"></div>
                        </div>

                        <div className="remember-forgot">
                            <div className="remember">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                <label htmlFor="remember">Запомнить меня</label>
                            </div>
                            <Link to="/forgot-password" className="forgot">Забыли пароль?</Link>
                        </div>

                        {error && (
                            <div id="signin-error" className="error-message" role="alert" aria-live="polite">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="auth-btn"
                            disabled={isLoading}
                            aria-describedby={isLoading ? "loading-status" : undefined}
                        >
                            <div className="btn-glow"></div>
                            <span>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} aria-hidden="true" />
                                        <span id="loading-status" style={srOnlyStyle}>Выполняется вход...</span>
                                    </>
                                ) : (
                                    "ВОЙТИ"
                                )}
                            </span>
                        </button>
                    </form>

                    <div className="auth-link">
                        Хотите попробовать? <Link to="/beta-test">Записаться на бета-тест</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
