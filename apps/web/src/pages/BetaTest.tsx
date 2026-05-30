import { Link } from "react-router-dom";
import { ArrowRight, Send } from "lucide-react";

const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "impulse_assistent_bot";
const TELEGRAM_BOT_URL = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=beta`;

export default function BetaTest() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--growth-bg,#0f0f10)] px-4">
            <div className="w-full max-w-sm text-center">
                <div className="mb-8">
                    <Link to="/" className="inline-block">
                        <h1 className="text-2xl font-bold tracking-tight text-white">Impulse</h1>
                    </Link>
                    <p className="mt-2 text-sm text-white/40">Бортовой журнал развития</p>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400/70">
                        Бета-тестирование
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-white/40">
                        Запись через Telegram — отправьте email боту и получите подтверждение
                    </p>

                    <a
                        href={TELEGRAM_BOT_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.08] py-3 text-sm font-medium text-white transition hover:bg-white/[0.14]"
                    >
                        <Send className="size-4" />
                        Открыть @{TELEGRAM_BOT_USERNAME}
                        <ArrowRight className="size-4" />
                    </a>
                </div>

                <p className="mt-5 text-sm text-white/30">
                    Уже есть аккаунт?{" "}
                    <Link to="/sign-in" className="text-white/60 transition hover:text-white">
                        Войти
                    </Link>
                </p>
            </div>
        </div>
    );
}
