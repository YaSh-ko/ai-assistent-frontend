import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle, Mail } from "lucide-react";
import { authApi } from "@/lib/api-client";
import { mapAuthError } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";
import ParticlesBackground from "@/components/ParticlesBackground";
import "../styles/auth.css";

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [isResending, setIsResending] = useState(false);
    const navigate = useNavigate();

    const token = searchParams.get('token');

    const verifyEmailToken = useCallback(async (verificationToken: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const { response, data } = await authApi.verifyEmail(verificationToken);

            if (!response.ok) {
                throw new Error(data.message || data.error || "Не удалось подтвердить email");
            }

            logger.authEvent('Email verified successfully');
            setIsVerified(true);
            
            // Если есть токен сессии, сохраняем его
            if (data.session?.token) {
                localStorage.setItem("auth_token", data.session.token);
            }

            // Перенаправляем на главную страницу через 3 секунды
            setTimeout(() => {
                navigate("/chat");
            }, 3000);

        } catch (err: any) {
            logger.authError('Email verification failed', err);
            setError(mapAuthError(err?.message));
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        if (token) {
            void verifyEmailToken(token);
        }
    }, [token, verifyEmailToken]);

    const handleResendVerification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            setError("Введите email-адрес");
            return;
        }

        setIsResending(true);
        setError(null);

        try {
            const { response, data } = await authApi.resendVerification(email);

            if (!response.ok) {
                throw new Error(data.message || data.error || "Не удалось отправить письмо повторно");
            }

            logger.info('Verification email resent successfully', { email });
            setError(null);
            // Показываем сообщение об успешной отправке
            alert("Письмо с подтверждением отправлено на ваш email");

        } catch (err: any) {
            logger.authError('Resend verification failed', err);
            setError(mapAuthError(err?.message));
        } finally {
            setIsResending(false);
        }
    };

    const renderTokenVerificationContent = () => {
        if (isLoading) {
            return (
                <>
                    <div className="flex justify-center mb-6">
                        <Loader2 className="animate-spin text-blue-500" size={48} />
                    </div>
                    <h2 className="auth-title">ПОДТВЕРЖДЕНИЕ EMAIL</h2>
                    <p className="auth-subtitle">Проверяем ваш email-адрес...</p>
                </>
            );
        }

        if (isVerified) {
            return (
                <>
                    <div className="flex justify-center mb-6">
                        <CheckCircle className="text-green-500" size={48} />
                    </div>
                    <h2 className="auth-title">EMAIL ПОДТВЕРЖДЕН</h2>
                    <p className="auth-subtitle">
                        Ваш email успешно подтверждён! Перенаправляем вас в чат...
                    </p>
                    <div className="mt-6">
                        <Link to="/chat" className="auth-btn">
                            <div className="btn-glow"></div>
                            <span>ПЕРЕЙТИ К ЧАТУ</span>
                        </Link>
                    </div>
                </>
            );
        }

        return (
            <>
                <div className="flex justify-center mb-6">
                    <XCircle className="text-red-500" size={48} />
                </div>
                <h2 className="auth-title">ОШИБКА ПОДТВЕРЖДЕНИЯ</h2>
                <p className="auth-subtitle">
                    Не удалось подтвердить ваш email-адрес
                </p>
                {error && (
                    <div className="error-message mb-4">
                        {error}
                    </div>
                )}
                <div className="auth-link">
                    <Link to="/sign-up">Зарегистрироваться заново</Link> или{" "}
                    <Link to="/sign-in">Войти</Link>
                </div>
            </>
        );
    };

    return (
        <div className="auth-body auth-page">
            <ParticlesBackground />
            <div className="auth-container">
                <div className="form-box">
                    {/* Если есть токен, показываем результат верификации */}
                    {token ? (
                        renderTokenVerificationContent()
                    ) : (
                        /* Если нет токена, показываем форму для повторной отправки */
                        <>
                            <div className="flex justify-center mb-6">
                                <Mail className="text-blue-500" size={48} />
                            </div>
                            <h2 className="auth-title">ПОДТВЕРЖДЕНИЕ EMAIL</h2>
                            <p className="auth-subtitle">
                                Введите email для повторной отправки письма с подтверждением
                            </p>

                            <form className="auth-form" onSubmit={handleResendVerification}>
                                <div className="input-group">
                                    <input
                                        id="verify-email"
                                        type="email"
                                        className="input-field"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                    />
                                    <label htmlFor="verify-email">Электронная почта</label>
                                    <div className="glow-line"></div>
                                </div>

                                {error && (
                                    <div className="error-message">
                                        {error}
                                    </div>
                                )}

                                <button type="submit" className="auth-btn" disabled={isResending}>
                                    <div className="btn-glow"></div>
                                    <span>
                                        {isResending ? (
                                            <Loader2 className="animate-spin" size={20} />
                                        ) : (
                                            "ОТПРАВИТЬ ПИСЬМО"
                                        )}
                                    </span>
                                </button>
                            </form>

                            <div className="auth-link">
                                <Link to="/sign-in">Вернуться к входу</Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}