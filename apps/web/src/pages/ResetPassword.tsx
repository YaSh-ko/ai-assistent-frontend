import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { validatePassword, mapAuthError } from "@/lib/auth-utils";
import ParticlesBackground from "@/components/ParticlesBackground";
import PasswordToggleButton from "@/components/PasswordToggleButton";
import "../styles/auth.css";

// В dev режиме запросы идут через Vite proxy (обход CORS)
const API_BASE_URL = import.meta.env.PROD ? "https://api.delez-repo.ru" : "";

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    // Если токен отсутствует, показываем ошибку
    if (!token) {
        return (
            <div className="auth-body">
                <ParticlesBackground />
                <div className="auth-container">
                    <div className="form-box">
                        <div className="error-icon">
                            <AlertCircle size={64} />
                        </div>
                        <h2 className="auth-title">НЕДЕЙСТВИТЕЛЬНАЯ ССЫЛКА</h2>
                        <p className="auth-subtitle">
                            Ссылка для сброса пароля недействительна или устарела. Запросите новую ссылку.
                        </p>
                        <button 
                            onClick={() => navigate("/forgot-password")}
                            className="auth-btn"
                        >
                            <div className="btn-glow"></div>
                            <span>ЗАПРОСИТЬ НОВУЮ ССЫЛКУ</span>
                        </button>
                        <div className="auth-link">
                            <Link to="/sign-in">← Ко входу</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Client-side validation
        if (!validatePassword(password)) {
            setError(mapAuthError("Password is too short"));
            return;
        }

        if (password !== confirmPassword) {
            setError("Пароли не совпадают");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token,
                    password
                }),
                credentials: "include"
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || data.error || "Request failed");
            }

            setIsSuccess(true);
            // Переход на страницу входа через 3 секунды
            setTimeout(() => {
                navigate("/sign-in");
            }, 3000);
        } catch (err: any) {
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
                        <h2 className="auth-title">ПАРОЛЬ ИЗМЕНЁН</h2>
                        <p className="auth-subtitle">
                            Ваш пароль успешно изменён. Сейчас вы будете перенаправлены на страницу входа.
                        </p>
                        <button 
                            onClick={() => navigate("/sign-in")}
                            className="auth-btn"
                        >
                            <div className="btn-glow"></div>
                            <span>ВОЙТИ СЕЙЧАС</span>
                        </button>
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
                    <h2 className="auth-title">НОВЫЙ ПАРОЛЬ</h2>
                    <p className="auth-subtitle">Введите новый пароль для аккаунта</p>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="input-group" style={{ position: 'relative' }}>
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                className="input-field"
                                style={{ paddingRight: '40px' }}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                            />
                            <label htmlFor="password">Новый пароль</label>
                            <PasswordToggleButton show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                            <div className="glow-line"></div>
                        </div>

                        <div className="input-group" style={{ position: 'relative' }}>
                            <input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                className="input-field"
                                style={{ paddingRight: '40px' }}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                            />
                            <label htmlFor="confirmPassword">Подтвердите пароль</label>
                            <PasswordToggleButton show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
                            <div className="glow-line"></div>
                        </div>

                        <div className="auth-subtitle" style={{fontSize: '12px', marginBottom: '20px'}}>
                            Минимум 8 символов
                        </div>

                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        <button type="submit" className="auth-btn" disabled={isLoading}>
                            <div className="btn-glow"></div>
                            <span>{isLoading ? <Loader2 className="animate-spin" size={20} /> : "СОХРАНИТЬ ПАРОЛЬ"}</span>
                        </button>
                    </form>

                    <div className="auth-link">
                        <Link to="/sign-in">← Ко входу</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
