import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Loader2, Mail, RefreshCw } from "lucide-react";
import { authApi } from "@/lib/api-client";
import { mapAuthError } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";
import ParticlesBackground from "@/components/ParticlesBackground";
import "../styles/auth.css";

export default function EmailSent() {
    const location = useLocation();
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    
    // Получаем email из state, переданного при навигации
    const email = location.state?.email || "";

    const handleResendEmail = async () => {
        if (!email) {
            setError("Email адрес не найден");
            return;
        }

        setIsResending(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const { response, data } = await authApi.resendVerification(email);

            if (!response.ok) {
                throw new Error(data.message || data.error || "Failed to resend verification");
            }

            logger.info('Verification email resent successfully', { email });
            setSuccessMessage("Письмо с подтверждением отправлено повторно!");

        } catch (err: any) {
            logger.authError('Resend verification failed', err);
            setError(mapAuthError(err?.message));
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="auth-body auth-page">
            <ParticlesBackground />
            <div className="auth-container">
                <div className="form-box">
                    <div className="flex justify-center mb-6">
                        <Mail className="text-blue-500" size={48} />
                    </div>
                    
                    <h2 className="auth-title">ПРОВЕРЬТЕ ПОЧТУ</h2>
                    <p className="auth-subtitle">
                        Мы отправили письмо с подтверждением на адрес:
                    </p>
                    
                    {email && (
                        <div className="text-center mb-6">
                            <strong className="text-blue-400">{email}</strong>
                        </div>
                    )}
                    
                    <div className="text-center mb-6 text-gray-300 text-sm">
                        <p>Перейдите по ссылке в письме для подтверждения аккаунта.</p>
                        <p className="mt-2">Не забудьте проверить папку "Спам".</p>
                    </div>

                    {successMessage && (
                        <div className="success-message mb-4">
                            {successMessage}
                        </div>
                    )}

                    {error && (
                        <div className="error-message mb-4">
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col gap-4">
                        <button 
                            onClick={handleResendEmail}
                            className="auth-btn"
                            disabled={isResending || !email}
                        >
                            <div className="btn-glow"></div>
                            <span className="flex items-center justify-center gap-2">
                                {isResending ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <RefreshCw size={20} />
                                )}
                                ОТПРАВИТЬ ПОВТОРНО
                            </span>
                        </button>

                        <Link to="/verify-email" className="auth-btn bg-gray-600 hover:bg-gray-500">
                            <div className="btn-glow"></div>
                            <span>ВВЕСТИ КОД ВРУЧНУЮ</span>
                        </Link>
                    </div>

                    <div className="auth-link mt-6">
                        <Link to="/sign-in">Вернуться к входу</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}