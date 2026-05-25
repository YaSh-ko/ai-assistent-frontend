import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { authApi, importApi, type ProfileData } from "../lib/api-client";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { toast } from "sonner";

type GenderValue = "male" | "female" | "other" | "";
const AI_PERSONA_STORAGE_KEY = "delez_ai_persona_v1";

const emptyProfile: ProfileData = {
  id: "",
  email: "",
  name: "",
  bio: "",
  gender: null,
  age: null,
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [section, setSection] = useState<"profile" | "security" | "support" | "import" | "assistant">("profile");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [importText, setImportText] = useState<string>("");
  const [assistantPersona, setAssistantPersona] = useState<string>("Баланс: эмпатия + структурность");
  const [assistantRole, setAssistantRole] = useState<string>("Навигатор изменений");
  const [importSaving, setImportSaving] = useState<boolean>(false);
  const [importCreateEntries, setImportCreateEntries] = useState<boolean>(true);
  const [importCreateGoals, setImportCreateGoals] = useState<boolean>(true);
  const [importCreateExperiments, setImportCreateExperiments] = useState<boolean>(true);
  const [importResult, setImportResult] = useState<string | null>(null);

  // Голосовой ввод для поля "О себе"
  const bioTextareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    isListening: isBioListening,
    transcript: bioTranscript,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AI_PERSONA_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { persona?: string; role?: string };
      if (typeof parsed.persona === "string" && parsed.persona.trim()) {
        setAssistantPersona(parsed.persona);
      }
      if (typeof parsed.role === "string" && parsed.role.trim()) {
        setAssistantRole(parsed.role);
      }
    } catch (error) {
      console.error("Не удалось загрузить персону ИИ", error);
    }
  }, []);

  useEffect(() => {
    if (bioTranscript) {
      setProfile((prev) => {
        const separator = prev.bio?.trim() ? ' ' : '';
        return { ...prev, bio: (prev.bio ?? '') + separator + bioTranscript };
      });
      resetTranscript();
    }
  }, [bioTranscript, resetTranscript]);

  const handleBioVoiceInput = useCallback(() => {
    if (!isSpeechSupported) {
      toast.error("Голосовой ввод не поддерживается в вашем браузере");
      return;
    }
    if (isBioListening) {
      stopListening();
    } else {
      setTimeout(() => bioTextareaRef.current?.focus(), 0);
      startListening();
    }
  }, [isSpeechSupported, isBioListening, stopListening, startListening]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await authApi.getProfile();
        setProfile(data);
      } catch (err: any) {
        setError(err?.message || "Не удалось загрузить профиль");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!success) return;
    const timeoutId = globalThis.setTimeout(() => setSuccess(null), 5000);
    return () => globalThis.clearTimeout(timeoutId);
  }, [success]);

  useEffect(() => {
    if (!securitySuccess) return;
    const timeoutId = globalThis.setTimeout(() => setSecuritySuccess(null), 5000);
    return () => globalThis.clearTimeout(timeoutId);
  }, [securitySuccess]);

  const ageInputValue = useMemo(() => {
    if (profile.age == null) return "";
    return String(profile.age);
  }, [profile.age]);

  const saveProfile = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const updated = await authApi.updateProfile({
        name: profile.name?.trim() || "",
        email: profile.email?.trim() || "",
        bio: profile.bio ?? "",
        gender: (profile.gender as GenderValue) ?? "",
        age: profile.age ?? null,
      });
      setProfile((prev) => ({ ...prev, ...updated, age: updated.age ?? prev.age }));
      setSuccess("Профиль сохранен");
    } catch (err: any) {
      setError(err?.message || "Не удалось сохранить профиль");
    } finally {
      setSaving(false);
    }
  };

  const setGender = (value: GenderValue) => {
    setProfile((prev) => ({ ...prev, gender: value || null }));
  };

  const setAgeValue = (nextValue: number | null) => {
    if (nextValue == null) {
      setProfile((prev) => ({ ...prev, age: null }));
      return;
    }
    const safeValue = Math.min(120, Math.max(0, nextValue));
    setProfile((prev) => ({ ...prev, age: safeValue }));
  };

  const increaseAge = () => setAgeValue((profile.age ?? 0) + 1);
  const decreaseAge = () => setAgeValue((profile.age ?? 0) - 1);

  const handleChangePassword = async () => {
    setSecurityError(null);
    setSecuritySuccess(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setSecurityError("Заполните все поля пароля");
      return;
    }
    if (newPassword.length < 6) {
      setSecurityError("Новый пароль должен быть минимум 6 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError("Новый пароль и подтверждение не совпадают");
      return;
    }
    try {
      setSecuritySaving(true);
      await authApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSecuritySuccess("Пароль успешно изменен");
    } catch (err: any) {
      setSecurityError(err?.message || "Не удалось сменить пароль");
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleSignOut = async () => {
    setSecurityError(null);
    try {
      await authApi.signOut();
    } finally {
      localStorage.removeItem("auth_token");
      navigate("/sign-in");
    }
  };

  const handleMarkdownImport = async () => {
    const markdown = importText.trim();
    if (!markdown) {
      setError("Добавь текст markdown для импорта");
      setImportResult(null);
      return;
    }

    setImportSaving(true);
    setError(null);
    setImportResult(null);
    try {
      const result = await importApi.importMarkdown({
        markdown,
        create_entries: importCreateEntries,
        create_goals: importCreateGoals,
        create_experiments: importCreateExperiments,
        event_date: new Date().toISOString().slice(0, 10),
      });

      setImportResult(
        `Импорт завершён: событий ${result.entries_created}, целей ${result.goals_created}, экспериментов ${result.experiments_created}.`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Импорт не выполнен";
      setError(message);
    } finally {
      setImportSaving(false);
    }
  };
  const handleSaveAssistantPersona = () => {
    const persona = assistantPersona.trim();
    const role = assistantRole.trim();
    if (!persona || !role) {
      setError("Заполни стиль и роль ассистента");
      setSuccess(null);
      return;
    }
    localStorage.setItem(AI_PERSONA_STORAGE_KEY, JSON.stringify({ persona, role }));
    setError(null);
    setSuccess("Персона ИИ сохранена и применяется в чате");
  };
  // Status content based on current section
  const statusContent = (() => {
    if (section === "profile") {
      return (
        <>
          {error ? <span className="text-rose-300">{error}</span> : null}
          {!error && success ? <span className="text-emerald-300">{success}</span> : null}
        </>
      );
    }
    if (section === "security") {
      return (
        <>
          {securityError ? <span className="text-rose-300">{securityError}</span> : null}
          {!securityError && securitySuccess ? <span className="text-emerald-300">{securitySuccess}</span> : null}
        </>
      );
    }
    if (section === "support" || section === "import" || section === "assistant") {
      return (
        <div className="pointer-events-none flex h-32 items-center justify-center rounded-xl border border-zinc-800/80 bg-white/5 px-6 text-sm text-white/50">
          Delёz · рост и развитие
        </div>
      );
    }
    return null;
  })();
  return (
    <div className="growth-page h-screen overflow-hidden">
      <div className="relative mx-auto h-full max-w-6xl px-6 py-6">
        <div className="pointer-events-none absolute inset-0 opacity-35">
          <svg viewBox="0 0 1200 760" className="h-full w-full">
            <g stroke="rgba(255,255,255,0.10)" strokeWidth="1">
              <line x1="80" y1="120" x2="260" y2="190" />
              <line x1="260" y1="190" x2="420" y2="120" />
              <line x1="420" y1="120" x2="610" y2="210" />
              <line x1="610" y1="210" x2="810" y2="140" />
              <line x1="810" y1="140" x2="1030" y2="220" />
              <line x1="170" y1="510" x2="330" y2="430" />
              <line x1="330" y1="430" x2="530" y2="520" />
              <line x1="530" y1="520" x2="760" y2="430" />
              <line x1="760" y1="430" x2="980" y2="520" />
            </g>
            <g fill="rgba(255,255,255,0.18)">
              <circle cx="80" cy="120" r="2" />
              <circle cx="260" cy="190" r="2" />
              <circle cx="420" cy="120" r="2" />
              <circle cx="610" cy="210" r="2" />
              <circle cx="810" cy="140" r="2" />
              <circle cx="1030" cy="220" r="2" />
              <circle cx="170" cy="510" r="2" />
              <circle cx="330" cy="430" r="2" />
              <circle cx="530" cy="520" r="2" />
              <circle cx="760" cy="430" r="2" />
              <circle cx="980" cy="520" r="2" />
            </g>
          </svg>
        </div>
        <div className="pointer-events-none absolute left-0 top-0 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative flex h-full flex-col">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-sm text-slate-400">
                <Link to="/navigation" className="transition hover:text-slate-200">Главная</Link> /{" "}
                <span className="text-slate-100">Профиль</span>
              </p>
              <h1 className="mt-3 text-4xl font-semibold">Профиль</h1>
            </div>
            <Link
              to="/report"
              className="growth-btn-secondary text-sm"
            >
              Аналитика
            </Link>
          </div>

          {loading ? (
            <div className="flex h-full items-center justify-center rounded-3xl border border-zinc-800/80 bg-white/[0.04] backdrop-blur">
              Загрузка профиля...
            </div>
          ) : (
            <div className="flex h-full min-h-0 gap-4">
              <aside className="w-[210px] shrink-0 rounded-2xl border border-zinc-800/80 bg-[#070b22]/60 p-3">
                <div className="mb-2 px-2 text-xs uppercase tracking-widest text-slate-500">Разделы</div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setSection("profile")}
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                      section === "profile"
                        ? "border-white/30 bg-white/[0.10] text-white"
                        : "border-transparent bg-transparent text-slate-300 hover:bg-white/[0.06]"
                    }`}
                  >
                    Профиль
                  </button>
                  <button
                    type="button"
                    onClick={() => setSection("security")}
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                      section === "security"
                        ? "border-white/30 bg-white/[0.10] text-white"
                        : "border-transparent bg-transparent text-slate-300 hover:bg-white/[0.06]"
                    }`}
                  >
                    Безопасность
                  </button>
                  <button
                    type="button"
                    onClick={() => setSection("import")}
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                      section === "import"
                        ? "border-white/30 bg-white/[0.10] text-white"
                        : "border-transparent bg-transparent text-slate-300 hover:bg-white/[0.06]"
                    }`}
                  >
                    Импорт
                  </button>
                  <button
                    type="button"
                    onClick={() => setSection("assistant")}
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                      section === "assistant"
                        ? "border-white/30 bg-white/[0.10] text-white"
                        : "border-transparent bg-transparent text-slate-300 hover:bg-white/[0.06]"
                    }`}
                  >
                    Персона ИИ
                  </button>
                  <button
                    type="button"
                    onClick={() => setSection("support")}
                    className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                      section === "support"
                        ? "border-white/30 bg-white/[0.10] text-white"
                        : "border-transparent bg-transparent text-slate-300 hover:bg-white/[0.06]"
                    }`}
                  >
                    Поддержка
                  </button>
                </div>
              </aside>

              <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/12 bg-white/[0.035] p-6 shadow-[0_18px_64px_-42px_rgba(0,0,0,0.6)] backdrop-blur">
                <div className="min-h-0 flex-1">
                  {section === "profile" ? (
                    <div className="grid min-h-0 h-full grid-cols-1 gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm text-slate-300">Имя</span>
                        <input
                          value={profile.name ?? ""}
                          onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                          className="h-12 w-full rounded-xl border border-white/15 bg-[#070b22]/90 px-4 text-sm outline-none transition focus:border-white/35"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm text-slate-300">Email</span>
                        <input
                          type="email"
                          value={profile.email ?? ""}
                          onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                          className="h-12 w-full rounded-xl border border-white/15 bg-[#070b22]/90 px-4 text-sm outline-none transition focus:border-white/35"
                        />
                      </label>

                      <div>
                        <span className="mb-2 block text-sm text-slate-300">Пол</span>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {[
                            { value: "", label: "Не указан" },
                            { value: "male", label: "Мужской" },
                            { value: "female", label: "Женский" },
                            { value: "other", label: "Другой" },
                          ].map((option) => {
                            const active = ((profile.gender as GenderValue) ?? "") === option.value;
                            return (
                              <button
                                key={option.value || "unknown"}
                                type="button"
                                onClick={() => setGender(option.value as GenderValue)}
                                className={`h-12 rounded-xl border px-3 text-sm transition ${
                                  active
                                    ? "border-white/35 bg-white/[0.10] text-white"
                                    : "border-white/15 bg-[#070b22]/80 text-slate-300 hover:border-white/25"
                                }`}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <span className="mb-2 block text-sm text-slate-300">Возраст</span>
                        <div className="flex h-12 items-center rounded-xl border border-white/15 bg-[#070b22]/90">
                          <button
                            type="button"
                            onClick={decreaseAge}
                            className="h-full w-12 rounded-l-xl border-r border-zinc-800/80 text-xl text-slate-300 transition hover:bg-zinc-800/60"
                            aria-label="Уменьшить возраст"
                          >
                            -
                          </button>
                          <input
                            inputMode="numeric"
                            value={ageInputValue}
                            onChange={(e) => {
                              const digitsOnly = e.target.value.replaceAll(/\D/g, "");
                              if (!digitsOnly) {
                                setAgeValue(null);
                                return;
                              }
                              setAgeValue(Number(digitsOnly));
                            }}
                            placeholder="—"
                            className="h-full flex-1 bg-transparent px-3 text-center text-base outline-none"
                          />
                          <button
                            type="button"
                            onClick={increaseAge}
                            className="h-full w-12 rounded-r-xl border-l border-zinc-800/80 text-xl text-slate-300 transition hover:bg-zinc-800/60"
                            aria-label="Увеличить возраст"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <label className="block md:col-span-2">
                        <span className="mb-2 block text-sm text-slate-300">О себе</span>
                        <div className="relative">
                          <textarea
                            ref={bioTextareaRef}
                            rows={5}
                            value={profile.bio ?? ""}
                            onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))}
                            className="delez-scrollbar h-[calc(100%-1.75rem)] min-h-28 w-full resize-none rounded-xl border border-white/15 bg-[#070b22]/90 px-4 py-3 pr-10 text-sm outline-none transition focus:border-white/35"
                          />
                          <motion.button
                            type="button"
                            onClick={handleBioVoiceInput}
                            title={isBioListening ? "Остановить запись" : "Голосовой ввод"}
                            animate={{ scale: isBioListening ? 1.2 : 1 }}
                            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                            className="absolute bottom-3 right-3 cursor-pointer border-none bg-transparent p-0 outline-none"
                          >
                            <img
                              src="/image 3.png"
                              alt="Voice Input"
                              className={`h-5 w-auto transition-opacity duration-300 ${isBioListening ? "opacity-100" : "opacity-50 hover:opacity-100"}`}
                            />
                            <motion.div
                              animate={{ opacity: isBioListening ? 1 : 0, scale: isBioListening ? 1 : 0 }}
                              transition={{ duration: 0.3 }}
                              className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-white"
                            />
                          </motion.button>
                          {isBioListening && (
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-lg bg-white px-4 py-2 text-xs font-medium text-[#09090b] shadow-lg pointer-events-none">
                              Говорите...
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  ) : section === "security" ? (
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold">Безопасность</h2>
                      <div className="grid grid-cols-1 gap-3">
                        <label className="block">
                          <span className="mb-2 block text-sm text-slate-300">Текущий пароль</span>
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="h-12 w-full rounded-xl border border-white/15 bg-[#070b22]/90 px-4 text-sm outline-none transition focus:border-white/35"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm text-slate-300">Новый пароль</span>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="h-12 w-full rounded-xl border border-white/15 bg-[#070b22]/90 px-4 text-sm outline-none transition focus:border-white/35"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm text-slate-300">Подтвердите новый пароль</span>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="h-12 w-full rounded-xl border border-white/15 bg-[#070b22]/90 px-4 text-sm outline-none transition focus:border-white/35"
                          />
                        </label>
                      </div>
                    </div>
                  ) : section === "support" ? (
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold">Поддержка</h2>
                      <p className="text-sm text-slate-400">Свяжитесь с нами любым удобным способом.</p>
                      <div className="flex flex-col gap-3">
                        {/* VKontakte */}
                        <a
                          href="https://vk.com/delez_app"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-4 rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-5 py-4 transition hover:bg-white/[0.07] hover:border-zinc-800"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "#0077FF" }}>
                            <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
                              <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.762-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.745-.576.745z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">ВКонтакте</div>
                            <div className="text-xs text-slate-500">vk.com/delez_app</div>
                          </div>
                          <svg className="ml-auto h-4 w-4 text-slate-600 transition group-hover:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </a>
                        {/* Telegram */}
                        <a
                          href="https://t.me/delez_support"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-4 rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-5 py-4 transition hover:bg-white/[0.07] hover:border-zinc-800"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "#2AABEE" }}>
                            <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
                              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">Telegram</div>
                            <div className="text-xs text-slate-500">@delez_support</div>
                          </div>
                          <svg className="ml-auto h-4 w-4 text-slate-600 transition group-hover:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </a>
                        {/* Mail.ru */}
                        <a
                          href="mailto:support@delez.tech"
                          className="group flex items-center gap-4 rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-5 py-4 transition hover:bg-white/[0.07] hover:border-zinc-800"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "#005FF9" }}>
                            <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
                              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6 8l-6 4-6-4h12zm0 8H6V9.5l6 4 6-4V16z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">Mail</div>
                            <div className="text-xs text-slate-500">support@delez.tech</div>
                          </div>
                          <svg className="ml-auto h-4 w-4 text-slate-600 transition group-hover:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  ) : section === "import" ? (
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold">Импорт записей</h2>
                      <p className="text-sm text-slate-400">
                        Вставьте текст из другого приложения или markdown-файла. На следующем шаге это будет разложено
                        по сущностям Delёz (события, цели, эксперименты).
                      </p>
                      <label className="block">
                        <span className="mb-2 block text-sm text-slate-300">Текст для импорта</span>
                        <textarea
                          rows={8}
                          value={importText}
                          onChange={(e) => setImportText(e.target.value)}
                          placeholder="Вставьте сюда записи в свободном формате..."
                          className="delez-scrollbar w-full resize-none rounded-xl border border-white/15 bg-[#070b22]/90 px-4 py-3 text-sm outline-none transition focus:border-white/35"
                        />
                      </label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {[
                          { key: "entries", label: "Создать события", value: importCreateEntries, setValue: setImportCreateEntries },
                          { key: "goals", label: "Создать цели", value: importCreateGoals, setValue: setImportCreateGoals },
                          { key: "experiments", label: "Создать эксперименты", value: importCreateExperiments, setValue: setImportCreateExperiments },
                        ].map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => item.setValue(!item.value)}
                            className="rounded-xl border px-3 py-2 text-xs transition"
                            style={{
                              borderColor: item.value ? "rgba(52,211,153,0.45)" : "rgba(255,255,255,0.18)",
                              background: item.value ? "rgba(52,211,153,0.18)" : "rgba(255,255,255,0.03)",
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4">
                        <p className="text-xs text-slate-500">Предпросмотр</p>
                        <p className="mt-2 text-sm text-slate-300">
                          {importText.trim()
                            ? `Символов: ${importText.trim().length}. После подтверждения данные будут подготовлены к импорту.`
                            : "Нет данных для предпросмотра."}
                        </p>
                        {importResult ? <p className="mt-2 text-xs text-emerald-300">{importResult}</p> : null}
                      </div>
                    </div>
                  ) : section === "assistant" ? (
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold">Персона ИИ-ассистента</h2>
                      <p className="text-sm text-slate-400">
                        Настройте стиль и роль ИИ. Это влияет на тон, рекомендации и формат обратной связи.
                      </p>
                      <label className="block">
                        <span className="mb-2 block text-sm text-slate-300">Стиль общения</span>
                        <input
                          value={assistantPersona}
                          onChange={(e) => setAssistantPersona(e.target.value)}
                          className="h-12 w-full rounded-xl border border-white/15 bg-[#070b22]/90 px-4 text-sm outline-none transition focus:border-white/35"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm text-slate-300">Роль ассистента</span>
                        <input
                          value={assistantRole}
                          onChange={(e) => setAssistantRole(e.target.value)}
                          className="h-12 w-full rounded-xl border border-white/15 bg-[#070b22]/90 px-4 text-sm outline-none transition focus:border-white/35"
                        />
                      </label>
                      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4">
                        <p className="text-xs text-slate-500">Активная конфигурация</p>
                        <p className="mt-2 text-sm text-slate-200">{assistantPersona}</p>
                        <p className="mt-1 text-sm text-slate-400">{assistantRole}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="min-h-6 text-sm">
                    {statusContent}
                  </div>
                  <div className="flex items-center gap-2">
                    {section === "security" ? (
                      <>
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="rounded-xl border border-zinc-800 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
                        >
                          Выйти из профиля
                        </button>
                        <button
                          type="button"
                          onClick={handleChangePassword}
                          disabled={securitySaving}
                          className="rounded-xl border border-white/25 bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {securitySaving ? "Сохраняем..." : "Сменить пароль"}
                        </button>
                      </>
                    ) : section === "profile" ? (
                      <button
                        type="button"
                        onClick={saveProfile}
                        disabled={saving}
                        className="rounded-xl border border-white/25 bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? "Сохраняем..." : "Сохранить профиль"}
                      </button>
                    ) : section === "support" ? null : section === "import" ? (
                      <button
                        type="button"
                        onClick={handleMarkdownImport}
                        disabled={importSaving}
                        className="rounded-xl border border-white/25 bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.12]"
                      >
                        {importSaving ? "Импортируем..." : "Подготовить импорт"}
                      </button>
                    ) : section === "assistant" ? (
                      <button
                        type="button"
                        onClick={handleSaveAssistantPersona}
                        className="rounded-xl border border-white/25 bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.12]"
                      >
                        Сохранить персону
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

    </div>
  );
}
