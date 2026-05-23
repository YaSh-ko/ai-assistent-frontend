import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { authApi, type ProfileData } from "../lib/api-client";
import { MBTI_DATA } from "../lib/mbti-data";

type JungLocale = "en";

type MbtiDimension = "EI" | "SN" | "TF" | "JP";

interface JungQuestion {
  id: number;
  dimension: MbtiDimension;
  leftTrait: string;
  rightTrait: string;
}

interface JungCalculateResult {
  type: string;
  scores: {
    EI: number;
    SN: number;
    TF: number;
    JP: number;
  };
  percentages?: Record<string, number>;
}

type Gender = "male" | "female" | "other" | null;
const MBTI_RESULT_STORAGE_KEY = "mbti_last_result";
const MBTI_PROGRESS_STORAGE_KEY = "mbti_progress_draft";

const OPENJUNG_API = "https://openjung.org/api";
const DIMENSION_LABEL: Record<MbtiDimension, string> = {
  EI: "E/I",
  SN: "S/N",
  TF: "T/F",
  JP: "J/P",
};
const LOCALIZED_QUESTIONS_RU: JungQuestion[] = [
  { id: 1, dimension: "JP", leftTrait: "Составляю списки", rightTrait: "Полагаюсь на память" },
  { id: 2, dimension: "SN", leftTrait: "Хочу верить", rightTrait: "{{Скептичен|Скептична}}" },
  { id: 3, dimension: "EI", leftTrait: "Скучаю в одиночестве", rightTrait: "Нужно время в одиночестве" },
  { id: 4, dimension: "SN", leftTrait: "Принимаю вещи как есть", rightTrait: "Хочу, чтобы было иначе" },
  { id: 5, dimension: "JP", leftTrait: "Люблю порядок", rightTrait: "Кладу вещи куда придется" },
  { id: 6, dimension: "TF", leftTrait: "Ориентируюсь на чувства", rightTrait: "Ориентируюсь на логику" },
  { id: 7, dimension: "EI", leftTrait: "{{Разговорчивый|Разговорчивая}}", rightTrait: "{{Сдержанный|Сдержанная}}" },
  { id: 8, dimension: "SN", leftTrait: "Факты важнее", rightTrait: "Возможности важнее" },
  { id: 9, dimension: "JP", leftTrait: "Работаю по плану", rightTrait: "Действую по ситуации" },
  { id: 10, dimension: "TF", leftTrait: "{{Мягкий|Мягкая}} в оценках", rightTrait: "{{Прямой|Прямая}} в оценках" },
  { id: 11, dimension: "EI", leftTrait: "Быстро знакомлюсь", rightTrait: "{{Осторожен|Осторожна}} с новыми людьми" },
  { id: 12, dimension: "SN", leftTrait: "{{Практичный|Практичная}}", rightTrait: "{{Идейный|Идейная}}" },
  { id: 13, dimension: "JP", leftTrait: "Предпочитаю завершать", rightTrait: "Люблю оставлять варианты" },
  { id: 14, dimension: "TF", leftTrait: "Хочу любви людей", rightTrait: "Хочу уважения людей" },
  { id: 15, dimension: "EI", leftTrait: "Заряжаюсь в компаниях", rightTrait: "Устаю от вечеринок" },
  { id: 16, dimension: "SN", leftTrait: "Вписываюсь", rightTrait: "Выделяюсь" },
  { id: 17, dimension: "JP", leftTrait: "Беру обязательства", rightTrait: "Оставляю пути открытыми" },
  { id: 18, dimension: "TF", leftTrait: "Сочувствие важнее", rightTrait: "Справедливость важнее" },
  { id: 19, dimension: "EI", leftTrait: "Думаю вслух", rightTrait: "Сначала обдумываю внутри" },
  { id: 20, dimension: "SN", leftTrait: "Замечаю детали", rightTrait: "Вижу общую картину" },
  { id: 21, dimension: "JP", leftTrait: "Люблю четкие сроки", rightTrait: "Предпочитаю гибкий ритм" },
  { id: 22, dimension: "TF", leftTrait: "Стараюсь не ранить", rightTrait: "Говорю как есть" },
  { id: 23, dimension: "EI", leftTrait: "Ищу внешние впечатления", rightTrait: "Ищу внутреннюю тишину" },
  { id: 24, dimension: "SN", leftTrait: "Опираюсь на опыт", rightTrait: "Пробую новое" },
  { id: 25, dimension: "JP", leftTrait: "Порядок важнее", rightTrait: "Спонтанность важнее" },
  { id: 26, dimension: "TF", leftTrait: "Люди важнее результата", rightTrait: "Результат важнее людей" },
  { id: 27, dimension: "EI", leftTrait: "Легко включаюсь в общение", rightTrait: "Бережно дозирую общение" },
  { id: 28, dimension: "SN", leftTrait: "Конкретика", rightTrait: "Смыслы и идеи" },
  { id: 29, dimension: "JP", leftTrait: "Предсказуемость", rightTrait: "Свобода выбора" },
  { id: 30, dimension: "TF", leftTrait: "Чувства", rightTrait: "Логика" },
  { id: 31, dimension: "EI", leftTrait: "Проявляю эмоции открыто", rightTrait: "Держу эмоции при себе" },
  { id: 32, dimension: "SN", leftTrait: "Реалист", rightTrait: "Визионер" },
];

const applyGenderTone = (value: string, gender: Gender): string => {
  // Безопасная регулярка без backtracking: точное совпадение {{male|female}}
  return value.replaceAll(/\{\{([^|{}]+)\|([^|{}]+)\}\}/g, (_, male, female) => {
    if (gender === "female") return String(female);
    return String(male);
  });
};

const DIMENSIONS: Array<MbtiDimension> = ["EI", "SN", "TF", "JP"];

export default function MBTITestPage() {
  const locale: JungLocale = "en";
  const [questions, setQuestions] = useState<JungQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JungCalculateResult | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gender, setGender] = useState<Gender>(null);
  const isDraftRestoredRef = useRef(false);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const totalQuestions = questions.length || 32;
  const isComplete = questions.length > 0 && answeredCount === questions.length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);
  const currentQuestion = questions[currentIndex];

  const progressByDimension = useMemo(() => {
    return Object.fromEntries(
      DIMENSIONS.map((dim) => {
        const ids = questions.filter((q) => q.dimension === dim).map((q) => q.id);
        if (!ids.length) return [dim, 0];
        const answered = ids.filter((id) => answers[id] != null).length;
        return [dim, Math.round((answered / ids.length) * 100)];
      }),
    ) as Record<MbtiDimension, number>;
  }, [answers, questions]);

  useEffect(() => {
    const loadGender = async () => {
      try {
        const profile: ProfileData = await authApi.getProfile();
        setGender(profile.gender ?? null);
      } catch {
        setGender(null);
      }
    };
    void loadGender();
  }, []);

  useEffect(() => {
    const loadQuestions = async () => {
      setLoadingQuestions(true);
      setError(null);
      try {
        // Используем локализованный набор как основной, подстраивая формулировки под пол из профиля.
        const list = LOCALIZED_QUESTIONS_RU.map((item) => ({
          ...item,
          leftTrait: applyGenderTone(item.leftTrait, gender),
          rightTrait: applyGenderTone(item.rightTrait, gender),
        }));
        setQuestions(list);
      } catch {
        setQuestions(LOCALIZED_QUESTIONS_RU);
        setError("Не удалось загрузить вопросы, используется локальный набор.");
      } finally {
        setLoadingQuestions(false);
      }
    };

    void loadQuestions();
  }, [gender, locale]);

  useEffect(() => {
    if (!questions.length || isDraftRestoredRef.current) return;
    isDraftRestoredRef.current = true;

    try {
      const raw = localStorage.getItem(MBTI_PROGRESS_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        answers?: Record<string, number>;
        currentIndex?: number;
      };

      const ids = new Set(questions.map((q) => q.id));
      const restoredAnswers = Object.fromEntries(
        Object.entries(parsed.answers ?? {})
          .map(([id, value]) => [Number(id), Number(value)])
          .filter(([id, value]) => ids.has(id) && value >= 1 && value <= 5),
      ) as Record<number, number>;

      const maxIndex = Math.max(0, questions.length - 1);
      const restoredIndex =
        typeof parsed.currentIndex === "number"
          ? Math.min(Math.max(parsed.currentIndex, 0), maxIndex)
          : 0;

      if (Object.keys(restoredAnswers).length > 0) {
        setAnswers(restoredAnswers);
      }
      setCurrentIndex(restoredIndex);
    } catch {
      localStorage.removeItem(MBTI_PROGRESS_STORAGE_KEY);
    }
  }, [questions]);

  useEffect(() => {
    if (!questions.length || !isDraftRestoredRef.current || !!result) return;

    localStorage.setItem(
      MBTI_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        answers,
        currentIndex,
        updatedAt: new Date().toISOString(),
      }),
    );
  }, [answers, currentIndex, questions.length, result]);

  const updateAnswer = useCallback((questionId: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, questions.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!currentQuestion || loadingQuestions || submitting || !!result) return;
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;

      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName.toLowerCase();
        const isEditable = target.isContentEditable || tag === "input" || tag === "textarea" || tag === "select";
        if (isEditable) return;
      }

      if (event.key >= "1" && event.key <= "5") {
        event.preventDefault();
        updateAnswer(currentQuestion.id, Number(event.key));
      }
    };

    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [currentQuestion, loadingQuestions, result, submitting, updateAnswer]);

  const submitTest = async () => {
    if (!isComplete || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        answers: Object.fromEntries(Object.entries(answers).map(([id, value]) => [id, value])),
        locale,
        save: false,
      };

      const response = await fetch(`${OPENJUNG_API}/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || data?.message || "Не удалось рассчитать результат");
      }

      const calculated = data.result as JungCalculateResult;
      setResult(calculated);
      localStorage.removeItem(MBTI_PROGRESS_STORAGE_KEY);
      localStorage.setItem(
        MBTI_RESULT_STORAGE_KEY,
        JSON.stringify({
          ...calculated,
          completedAt: new Date().toISOString(),
        }),
      );
    } catch (err: any) {
      setError(err?.message || "Ошибка при отправке ответов");
    } finally {
      setSubmitting(false);
    }
  };

  const resetTest = () => {
    setAnswers({});
    setResult(null);
    setError(null);
    setCurrentIndex(0);
    localStorage.removeItem(MBTI_PROGRESS_STORAGE_KEY);
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#050816] text-white">
      <div className="mx-auto flex h-full max-h-[100dvh] max-w-5xl flex-col overflow-hidden px-6 py-3">
        <div className="mb-3 shrink-0">
          <p className="text-sm text-slate-400">
            <Link to="/chat" className="transition hover:text-slate-200">Главная</Link> /{" "}
            <Link to="/profile" className="transition hover:text-slate-200">Профиль</Link> /{" "}
            <span className="text-slate-100">MBTI тест</span>
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.24em] text-cyan-300/80">Оценка личности</p>
          <h1 className="mt-1 text-4xl font-semibold">Тест личности</h1>
          <p className="mt-1 text-slate-400">Выберите, где вы находитесь на шкале между двумя качествами.</p>
        </div>

        {loadingQuestions ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">Загрузка вопросов...</div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {!loadingQuestions && !result && currentQuestion ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between text-xl font-semibold">
              <span>{Math.min(currentIndex + 1, totalQuestions)} / {totalQuestions}</span>
              <span>{progressPercent}%</span>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {DIMENSIONS.map((dim) => {
                const dimGradient =
                  dim === "EI" ? "bg-gradient-to-r from-violet-400/80 to-fuchsia-400/80"
                  : dim === "SN" ? "bg-gradient-to-r from-emerald-300/80 to-cyan-300/80"
                  : dim === "TF" ? "bg-gradient-to-r from-amber-300/80 to-orange-400/80"
                  : "bg-gradient-to-r from-sky-300/80 to-blue-400/80";
                return (
                <div key={dim} className="space-y-2">
                  <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-white/5">
                    <div
                      className={`h-full ${dimGradient}`}
                      style={{ width: `${progressByDimension[dim]}%` }}
                    />
                  </div>
                  <div className="text-center text-xs tracking-widest text-slate-500">{DIMENSION_LABEL[dim]}</div>
                </div>
                );
              })}
            </div>

            <div className="h-[320px] shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_-35px_rgba(56,189,248,0.4)] backdrop-blur">
              <div className="flex h-full flex-col">
                <div className="flex h-20 items-center justify-center overflow-hidden">
                  <h2 className="line-clamp-2 text-center text-3xl font-medium leading-tight text-slate-100">
                  {currentQuestion.leftTrait} или {currentQuestion.rightTrait}
                  </h2>
                </div>

                <div className="mt-4 grid h-16 grid-cols-12 items-center gap-4">
                  <div className="col-span-3 line-clamp-2 text-lg text-amber-300">{currentQuestion.leftTrait}</div>
                  <div className="col-span-6" />
                  <div className="col-span-3 line-clamp-2 text-right text-lg text-amber-300">{currentQuestion.rightTrait}</div>
                </div>

                <div className="mt-4 grid h-20 grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map((v) => {
                    const active = answers[currentQuestion.id] === v;
                    const sideTone =
                      v <= 2
                        ? "border-amber-400/50 hover:border-amber-300/70"
                        : v === 3
                          ? "border-slate-500/60 hover:border-slate-400/80"
                          : "border-cyan-400/50 hover:border-cyan-300/70";
                    const buttonClass = active
                      ? "rounded-xl border bg-[#0b1026]/90 p-3 text-center transition border-cyan-300 bg-cyan-300/15 text-white"
                      : `rounded-xl border bg-[#0b1026]/90 p-3 text-center transition ${sideTone} text-slate-200`;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => updateAnswer(currentQuestion.id, v)}
                        className={buttonClass}
                      >
                        <div className="text-3xl font-semibold">{v}</div>
                      </button>
                    );
                  })}
                </div>

                <p className="mt-auto text-center text-xs text-slate-500">Совет: используйте клавиши 1-5 для ответа</p>
              </div>
            </div>

            <div className="shrink-0 rounded-xl border border-white/20 bg-[#0d123a]/95 p-3 backdrop-blur">
              <button
                type="button"
                onClick={submitTest}
                disabled={!isComplete || submitting}
                className="w-full rounded-lg border border-cyan-200/40 bg-cyan-300/20 px-4 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Рассчитываем..." : "Получить результат"}
              </button>
            </div>
          </div>
        ) : null}

        {result ? (() => {
          const mbti = MBTI_DATA[result.type];
          return (
            <div className="delez-scrollbar flex-1 overflow-y-auto space-y-4 pb-4">
              {/* Header */}
              <div className={`rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_-35px_rgba(56,189,248,0.3)]`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-5xl font-bold tracking-tight">{result.type}</span>
                      {mbti && (
                        <span className={`rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-sm font-medium ${mbti.groupColor}`}>
                          {mbti.group}
                        </span>
                      )}
                    </div>
                    {mbti && (
                      <div className="mt-1">
                        <span className="text-xl text-slate-200">{mbti.nameRu}</span>
                        <span className="ml-2 text-sm text-slate-500">{mbti.nameEn}</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {(["EI", "SN", "TF", "JP"] as const).map((dim) => (
                      <div key={dim} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-center">
                        <div className="font-mono text-slate-400">{dim}</div>
                        <div className="mt-0.5 font-semibold">{result.scores[dim]}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {mbti && (
                  <p className="mt-4 text-sm leading-relaxed text-slate-300">{mbti.description}</p>
                )}

                {mbti && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {mbti.traits.map((trait) => (
                      <span key={trait} className={`rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1 text-xs ${mbti.groupColor}`}>
                        {trait}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {mbti && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Strengths */}
                  <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/5 p-5">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-emerald-300/80">Сильные стороны</h3>
                    <ul className="space-y-2">
                      {mbti.strengths.map((s) => (
                        <li key={s} className="flex items-center gap-2 text-sm text-slate-300">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/70" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Weaknesses */}
                  <div className="rounded-2xl border border-rose-300/20 bg-rose-500/5 p-5">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-rose-300/80">Зоны роста</h3>
                    <ul className="space-y-2">
                      {mbti.weaknesses.map((w) => (
                        <li key={w} className="flex items-center gap-2 text-sm text-slate-300">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400/70" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {mbti && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-400">Карьерные пути</h3>
                  <div className="flex flex-wrap gap-2">
                    {mbti.careers.map((c) => (
                      <span key={c} className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm text-slate-200">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={resetTest}
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20"
                >
                  Пройти заново
                </button>
                <Link
                  to="/profile"
                  className="rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm text-slate-300 transition hover:bg-white/[0.06]"
                >
                  Перейти в профиль
                </Link>
              </div>
            </div>
          );
        })() : null}
      </div>
    </div>
  );
}
