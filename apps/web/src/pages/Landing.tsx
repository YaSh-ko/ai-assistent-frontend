import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Target, BarChart3 } from "lucide-react";

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--growth-bg,#0f0f10)] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <h1 className="text-xl font-bold tracking-tight">Delёz</h1>
        <Link
          to="/sign-in"
          className="rounded-xl bg-white/[0.08] px-5 py-2.5 text-sm font-medium transition hover:bg-white/[0.14]"
        >
          Войти
        </Link>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mx-auto max-w-xl">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-emerald-400/70">
            Бортовой журнал
          </p>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Личный рост —{" "}
            <span className="text-white/50">с опорой на данные</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/40 sm:text-lg">
            Фиксируй наблюдения, ставь цели, веди задачи.
            ИИ-ассистент помогает видеть связи и двигаться осознанно.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/sign-in"
              className="flex items-center gap-2 rounded-xl bg-white/[0.08] px-6 py-3 text-sm font-medium transition hover:bg-white/[0.14]"
            >
              Начать
              <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/beta-test"
              className="rounded-xl px-6 py-3 text-sm text-white/40 transition hover:text-white/70"
            >
              Записаться на бета-тест
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mx-auto mt-20 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: BookOpen, title: "Наблюдения", desc: "Фиксируй инсайты и события" },
            { icon: Target, title: "Цели и задачи", desc: "Из разговора — в план действий" },
            { icon: BarChart3, title: "Аналитика", desc: "Связи, прогресс, паттерны" },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-left"
            >
              <Icon className="mb-3 size-5 text-emerald-400/60" />
              <h3 className="text-sm font-medium">{title}</h3>
              <p className="mt-1 text-xs text-white/35">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center text-xs text-white/20">
        Delёz &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
