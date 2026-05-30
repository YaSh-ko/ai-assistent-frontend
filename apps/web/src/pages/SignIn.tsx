import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";
import { validateEmail } from "@/lib/auth-utils";
import { logger } from "@/lib/logger";
import authApi from "@/lib/api-client";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError("Некорректный email");
      return;
    }
    if (!password) {
      setError("Введите пароль");
      return;
    }

    setIsLoading(true);
    try {
      const body = { email: email.trim().toLowerCase(), password };
      const { response, data } = await authApi.signIn(body.email, body.password);

      if (!response.ok) {
        await handleError(response, data);
        return;
      }

      if (data.session?.token) {
        localStorage.setItem("auth_token", data.session.token);
      }

      logger.authEvent("User signed in", { email: body.email });
      navigate("/navigation");
    } catch (err: any) {
      logger.authError("Sign in failed", err);
      setError(err?.message || "Не удалось войти");
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = async (response: Response, data: any) => {
    const msg = data.message || data.error || "";

    if (response.status === 500)
      throw new Error("Ошибка сервера, попробуйте позже");

    if (response.status === 401) {
      if (msg.toLowerCase().includes("user not found"))
        throw new Error("Пользователь не найден");
      if (msg.toLowerCase().includes("not verified") || msg.toLowerCase().includes("не подтвержден")) {
        navigate("/verify-email", { state: { email: email.trim().toLowerCase() } });
        return;
      }
      throw new Error("Неверный email или пароль");
    }

    if (response.status === 400)
      throw new Error(msg || "Неверный формат данных");

    if (response.status === 403 && (msg.toLowerCase().includes("verify") || msg.toLowerCase().includes("подтвер"))) {
      navigate("/verify-email", { state: { email: email.trim().toLowerCase() } });
      return;
    }

    throw new Error(msg || "Ошибка входа");
  };

  const inputCls =
    "block w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/90 outline-none transition placeholder:text-white/30 focus:border-white/25 focus:bg-white/[0.06]";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--growth-bg,#0f0f10)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block">
            <h1 className="text-2xl font-bold tracking-tight text-white">Impulse</h1>
          </Link>
          <p className="mt-2 text-sm text-white/40">Бортовой журнал развития</p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-white">Вход</h2>
          <p className="mt-1 mb-6 text-sm text-white/40">Войдите, чтобы продолжить</p>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-white/40">
                  Пароль
                </label>
                <Link to="/forgot-password" className="text-xs text-white/30 transition hover:text-white/60">
                  Забыли?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputCls} pr-16`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30 transition hover:text-white/60"
                  tabIndex={-1}
                >
                  {showPassword ? "Скрыть" : "Показать"}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.08] py-3 text-sm font-medium text-white transition hover:bg-white/[0.14] disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Войти
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-white/30">
          Нет аккаунта?{" "}
          <Link to="/beta-test" className="text-white/60 transition hover:text-white">
            Записаться на бета-тест
          </Link>
        </p>
      </div>
    </div>
  );
}
