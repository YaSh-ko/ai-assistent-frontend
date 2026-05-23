import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, CheckCircle } from "lucide-react";
import { validateEmail, validatePassword, mapAuthError } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";
import ParticlesBackground from "@/components/ParticlesBackground";
import PasswordToggleButton from "@/components/PasswordToggleButton";
import "../styles/auth.css";

// В dev режиме запросы идут через Vite proxy (обход CORS)
const API_BASE_URL = import.meta.env.PROD ? "https://api.delez-repo.ru" : "";

export default function SignUp() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Client-side validation
        if (!name.trim()) {
            setError("Введите имя");
            return;
        }
        if (!validateEmail(email)) {
            setError(mapAuthError("Invalid email"));
            return;
        }
        if (!validatePassword(password)) {
            setError(mapAuthError("Password is too short"));
            return;
        }

        setIsLoading(true);

        try {
            const requestBody = {
                email: email.trim().toLowerCase(),
                password,
                name: name.trim() || "User"
            };

            logger.apiRequest('POST', '/auth/sign-up/email', { email: requestBody.email, name: requestBody.name });

            const response = await fetch(`${API_BASE_URL}/auth/sign-up/email`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
                credentials: "include"
            });

            const data = await response.json();
            logger.apiResponse(response.status, '/auth/sign-up/email', data);

            if (!response.ok) {
                if (response.status === 409 || (response.status === 400 && (data.message || data.error || data.detail || "").toLowerCase().includes("already exists"))) {
                    setError("Аккаунт уже зарегистрирован");
                    return;
                } else if (response.status === 422) {
                    throw new Error("Неверный формат данных");
                }
                throw new Error(data.message || data.error || data.detail || "Registration failed");
            }

            logger.authEvent('User registered successfully', { email: requestBody.email });
            // Registration successful - show success message
            setIsSuccess(true);
        } catch (err: any) {
            logger.authError('Registration failed', err);
            setError(mapAuthError(err?.message));
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
                        <h2 className="auth-title">ПРОВЕРЬТЕ ПОЧТУ</h2>
                        <p className="auth-subtitle">
                            Мы отправили письмо на <strong>{email}</strong>
                        </p>
                        <p className="auth-subtitle" style={{ marginTop: '10px', fontSize: '14px', color: '#a0aec0' }}>
                            Нажмите на ссылку в письме, чтобы подтвердить аккаунт и войти
                        </p>
                        <div className="auth-link" style={{ marginTop: '30px' }}>
                            <Link to="/sign-in">Перейти к входу</Link>
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
                    <h2 className="auth-title">СОЗДАТЬ АККАУНТ</h2>
                    <p className="auth-subtitle">Создайте аккаунт и начните путь с Delёz</p>

                    <form className="auth-form" onSubmit={handleSignUp}>
                        <div className="input-group">
                            <input
                                id="name"
                                type="text"
                                className="input-field"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                autoComplete="name"
                            />
                            <label htmlFor="name">Имя</label>
                            <div className="glow-line"></div>
                        </div>

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
                            <label htmlFor="password">Пароль</label>
                            <PasswordToggleButton show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                            <div className="glow-line"></div>
                        </div>

                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        <button type="submit" className="auth-btn" disabled={isLoading}>
                            <div className="btn-glow"></div>
                            <span>{isLoading ? <Loader2 className="animate-spin" size={20} /> : "ЗАРЕГИСТРИРОВАТЬСЯ"}</span>
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
