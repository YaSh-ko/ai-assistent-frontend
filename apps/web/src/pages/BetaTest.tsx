import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, CheckCircle } from "lucide-react";
import { logger } from "@/lib/logger";
import ParticlesBackground from "@/components/ParticlesBackground";
import "../styles/auth.css";

const API_BASE_URL = import.meta.env.PROD ? "https://api.delez-repo.ru" : "";
const TELEGRAM_NICK_REGEX = /^@\w{5,32}$/;

export default function BetaTest() {
    const [telegram, setTelegram] = useState("");
    const [email, setEmail] = useState("");
    const [acceptedPolicy, setAcceptedPolicy] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [telegramError, setTelegramError] = useState<string | null>(null);
    const [policyError, setPolicyError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setTelegramError(null);
        setPolicyError(null);

        const tg = telegram.trim();
        if (!tg.startsWith("@")) {
            setTelegramError("Ник должен начинаться с @");
            return;
        }
        if (!TELEGRAM_NICK_REGEX.test(tg)) {
            setTelegramError("Некорректный Telegram: после @ только буквы, цифры и _, длина 5-32");
            return;
        }

        const form = e.currentTarget;
        const emailEl = form.elements.namedItem("email") as HTMLInputElement | null;
        if (emailEl && !emailEl.checkValidity()) {
            emailEl.reportValidity();
            return;
        }
        const em = email.trim().toLowerCase();

        if (!acceptedPolicy) {
            setPolicyError("Необходимо принять политику обработки персональных данных");
            return;
        }

        setIsLoading(true);

        try {
            const requestBody = { telegram: tg, email: em };
            logger.apiRequest("POST", "/v1/beta-test", {
                hasTelegram: tg.length > 0,
                hasEmail: em.length > 0,
            });

            const response = await fetch(`${API_BASE_URL}/v1/beta-test`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
                credentials: "include",
            });

            if (!response.ok) {
                setError("Не удалось отправить заявку. Проверьте данные и попробуйте снова.");
                return;
            }

            setIsSuccess(true);
        } catch (err: unknown) {
            logger.authError('Beta test registration failed', err);
            setError("Произошла ошибка. Попробуйте позже.");
        } finally {
            setIsLoading(false);
        }
    };

    // Show success state after registration
    if (isSuccess) {
        return (
            <div className="auth-body">
                <ParticlesBackground />
                <div className="auth-container">
                    <div className="form-box">
                        <div className="flex justify-center mb-6">
                            <CheckCircle className="text-green-500" size={48} />
                        </div>
                        <h2 className="auth-title">СПАСИБО ЗА РЕГИСТРАЦИЮ!</h2>
                        <p className="auth-subtitle">
                            Мы отправим уведомление о запуске продукта на <strong>{email || telegram}</strong>
                        </p>
                        <p className="auth-subtitle" style={{ marginTop: '10px', fontSize: '14px', color: '#a0aec0' }}>
                            Следите за обновлениями!
                        </p>
                        <div className="auth-link" style={{ marginTop: '30px' }}>
                            <Link to="/">Вернуться на главную</Link>
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
                    <h2 className="auth-title">БЕТА-ТЕСТИРОВАНИЕ</h2>
                    <p className="auth-subtitle">Станьте одним из первых пользователей Delёz</p>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <p className="form-instruction">
                            Укажите Telegram и email, куда мы пришлем уведомление о запуске продукта
                        </p>

                        <div className="input-group">
                            <input
                                id="telegram"
                                type="text"
                                className="input-field"
                                value={telegram}
                                onChange={(e) => {
                                    setTelegram(e.target.value);
                                    setTelegramError(null);
                                }}
                                required
                                autoComplete="off"
                                placeholder=" "
                            />
                            <label htmlFor="telegram">Telegram (@username)</label>
                            <div className="glow-line"></div>
                        </div>
                        {telegramError && (
                            <div className="error-message">
                                {telegramError}
                            </div>
                        )}

                        <div className="input-group">
                            <input
                                id="email"
                                name="email"
                                type="email"
                                className="input-field"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                placeholder=" "
                            />
                            <label htmlFor="email">Электронная почта</label>
                            <div className="glow-line"></div>
                        </div>

                        {policyError && (
                            <div className="error-message">
                                {policyError}
                            </div>
                        )}

                        <div className="checkbox-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={acceptedPolicy}
                                    onChange={(e) => {
                                        setAcceptedPolicy(e.target.checked);
                                        if (e.target.checked) {
                                            setPolicyError(null);
                                        }
                                    }}
                                    className="checkbox-input"
                                    aria-label="Принять политику обработки персональных данных"
                                />
                                <span className="checkbox-text">
                                    <Link to="/privacy" target="_blank" className="policy-link">
                                        Политика обработки персональных данных
                                    </Link>
                                </span>
                            </label>
                        </div>

                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        <button type="submit" className="auth-btn" disabled={isLoading}>
                            <div className="btn-glow"></div>
                            <span>{isLoading ? <Loader2 className="animate-spin" size={20} /> : "ЗАПИСАТЬСЯ"}</span>
                        </button>
                    </form>

                    <div className="auth-link">
                        Уже есть аккаунт? <Link to="/sign-in">Войти</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
