import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { authApi, userApi, type ProfileData } from "../lib/api-client";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { toast } from "sonner";
import {
  User,
  Shield,
  Sparkles,
  ChevronRight,
  Mic,
  MicOff,
  LogOut,
  Save,
  Check,
} from "lucide-react";

type GenderValue = "male" | "female" | "other" | "";
type SectionId = "profile" | "security" | "assistant";

const emptyProfile: ProfileData = {
  id: "",
  email: "",
  name: "",
  bio: "",
  gender: null,
  age: null,
};

const TONE_PRESETS = [
  { id: "empathic", label: "Эмпатичный", desc: "Мягко, с пониманием и поддержкой" },
  { id: "structured", label: "Структурный", desc: "Чётко, по делу, с планом" },
  { id: "balanced", label: "Баланс", desc: "Эмпатия + структурность" },
  { id: "coaching", label: "Коучинг", desc: "Вопросами к инсайтам" },
  { id: "direct", label: "Прямой", desc: "Без воды, конкретные советы" },
] as const;

const ROLE_PRESETS = [
  { id: "navigator", label: "Навигатор", desc: "Помогает определить направление" },
  { id: "mentor", label: "Ментор", desc: "Делится опытом и подходами" },
  { id: "analyst", label: "Аналитик", desc: "Раскладывает по полочкам" },
  { id: "partner", label: "Партнёр", desc: "На равных, как друг-коллега" },
] as const;

const SECTIONS: { id: SectionId; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Профиль", icon: User },
  { id: "security", label: "Безопасность", icon: Shield },
  { id: "assistant", label: "Стиль ИИ", icon: Sparkles },
];

const inputCls =
  "h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white/90 outline-none transition placeholder:text-white/25 focus:border-white/25 focus:bg-white/[0.06]";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [section, setSection] = useState<SectionId>("profile");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [assistantTone, setAssistantTone] = useState("balanced");
  const [assistantRole, setAssistantRole] = useState("navigator");
  const [customTone, setCustomTone] = useState("");
  const [customRole, setCustomRole] = useState("");

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
    userApi.getPersona().then((data) => {
      if (data.ai_persona_tone) {
        const found = TONE_PRESETS.find((p) => p.id === data.ai_persona_tone || p.desc === data.ai_persona_tone);
        if (found) setAssistantTone(found.id);
        else { setAssistantTone("custom"); setCustomTone(data.ai_persona_tone); }
      }
      if (data.ai_persona_role) {
        const found = ROLE_PRESETS.find((p) => p.id === data.ai_persona_role || p.label === data.ai_persona_role);
        if (found) setAssistantRole(found.id);
        else { setAssistantRole("custom"); setCustomRole(data.ai_persona_role); }
      }
    }).catch(() => { /* ignore */ });
  }, []);

  useEffect(() => {
    if (bioTranscript) {
      setProfile((prev) => {
        const sep = prev.bio?.trim() ? " " : "";
        return { ...prev, bio: (prev.bio ?? "") + sep + bioTranscript };
      });
      resetTranscript();
    }
  }, [bioTranscript, resetTranscript]);

  const handleBioVoiceInput = useCallback(() => {
    if (!isSpeechSupported) {
      toast.error("Голосовой ввод не поддерживается в вашем браузере");
      return;
    }
    if (isBioListening) stopListening();
    else {
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
    const t = globalThis.setTimeout(() => setSuccess(null), 4000);
    return () => globalThis.clearTimeout(t);
  }, [success]);

  useEffect(() => {
    if (!securitySuccess) return;
    const t = globalThis.setTimeout(() => setSecuritySuccess(null), 4000);
    return () => globalThis.clearTimeout(t);
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
      setSuccess("Профиль сохранён");
    } catch (err: any) {
      setError(err?.message || "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const setGender = (value: GenderValue) =>
    setProfile((prev) => ({ ...prev, gender: value || null }));

  const setAgeValue = (v: number | null) => {
    if (v == null) { setProfile((prev) => ({ ...prev, age: null })); return; }
    setProfile((prev) => ({ ...prev, age: Math.min(120, Math.max(0, v)) }));
  };

  const handleChangePassword = async () => {
    setSecurityError(null);
    setSecuritySuccess(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setSecurityError("Заполните все поля");
      return;
    }
    if (newPassword.length < 6) {
      setSecurityError("Минимум 6 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError("Пароли не совпадают");
      return;
    }
    try {
      setSecuritySaving(true);
      await authApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSecuritySuccess("Пароль изменён");
    } catch (err: any) {
      setSecurityError(err?.message || "Не удалось сменить пароль");
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleSignOut = async () => {
    try { await authApi.signOut(); } finally {
      localStorage.removeItem("auth_token");
      navigate("/sign-in");
    }
  };

  const resolvedTone = assistantTone === "custom"
    ? customTone.trim()
    : (TONE_PRESETS.find((p) => p.id === assistantTone)?.desc ?? "");
  const resolvedRole = assistantRole === "custom"
    ? customRole.trim()
    : (ROLE_PRESETS.find((p) => p.id === assistantRole)?.label ?? "");

  const handleSaveAssistant = async () => {
    if (!resolvedTone || !resolvedRole) {
      setError("Укажите стиль и роль ассистента");
      return;
    }
    try {
      await userApi.patchPersona({
        ai_persona_tone: resolvedTone,
        ai_persona_role: resolvedRole,
      });
      setError(null);
      setSuccess("Настройки ИИ сохранены");
    } catch {
      setError("Не удалось сохранить настройки");
    }
  };

  const statusMsg = (() => {
    if (section === "profile") return error || success || null;
    if (section === "security") return securityError || securitySuccess || null;
    return error || success || null;
  })();
  const statusIsError = section === "security" ? !!securityError : !!error;

  return (
    <div className="h-screen overflow-hidden bg-[var(--growth-bg)] text-[var(--growth-text)]">
      <div className="relative mx-auto flex h-full max-w-5xl flex-col px-6 py-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-white/40">
              <Link to="/navigation" className="transition hover:text-white/70">Главная</Link>
              <span className="mx-1.5 text-white/20">/</span>
              <span className="text-white/70">Профиль</span>
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Настройки</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center text-white/40">
            Загрузка...
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 gap-5">
            {/* Sidebar */}
            <nav className="w-[200px] shrink-0 space-y-1 pt-1">
              {SECTIONS.map(({ id, label, icon: Icon }) => {
                const active = section === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSection(id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition ${
                      active
                        ? "bg-white/[0.08] text-white font-medium"
                        : "text-white/50 hover:bg-white/[0.04] hover:text-white/70"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    {label}
                    {active && <ChevronRight className="ml-auto size-3.5 text-white/30" />}
                  </button>
                );
              })}

              <div className="!mt-6 border-t border-white/[0.06] pt-4">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-white/40 transition hover:bg-rose-500/10 hover:text-rose-400"
                >
                  <LogOut className="size-4" />
                  Выйти
                </button>
              </div>
            </nav>

            {/* Content */}
            <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
              <div className="delez-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
                {section === "profile" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5"
                  >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">Имя</span>
                        <input
                          value={profile.name ?? ""}
                          onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                          className={inputCls}
                          placeholder="Ваше имя"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">Email</span>
                        <input
                          type="email"
                          value={profile.email ?? ""}
                          onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                          className={inputCls}
                          placeholder="email@example.com"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">Пол</span>
                        <div className="flex gap-1.5">
                          {[
                            { value: "", label: "—" },
                            { value: "male", label: "М" },
                            { value: "female", label: "Ж" },
                            { value: "other", label: "Др" },
                          ].map((opt) => {
                            const active = ((profile.gender as GenderValue) ?? "") === opt.value;
                            return (
                              <button
                                key={opt.value || "none"}
                                type="button"
                                onClick={() => setGender(opt.value as GenderValue)}
                                className={`h-11 flex-1 rounded-xl border text-sm transition ${
                                  active
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium"
                                    : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white/70"
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">Возраст</span>
                        <div className="flex h-11 items-center rounded-xl border border-white/10 bg-white/[0.04]">
                          <button
                            type="button"
                            onClick={() => setAgeValue((profile.age ?? 0) - 1)}
                            className="h-full w-11 rounded-l-xl text-lg text-white/40 transition hover:bg-white/[0.06] hover:text-white/70"
                          >
                            −
                          </button>
                          <input
                            inputMode="numeric"
                            value={ageInputValue}
                            onChange={(e) => {
                              const d = e.target.value.replaceAll(/\D/g, "");
                              setAgeValue(d ? Number(d) : null);
                            }}
                            placeholder="—"
                            className="h-full flex-1 bg-transparent text-center text-sm outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setAgeValue((profile.age ?? 0) + 1)}
                            className="h-full w-11 rounded-r-xl text-lg text-white/40 transition hover:bg-white/[0.06] hover:text-white/70"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">О себе</span>
                      <div className="relative">
                        <textarea
                          ref={bioTextareaRef}
                          rows={4}
                          value={profile.bio ?? ""}
                          onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                          placeholder="Расскажите немного о себе — это поможет ИИ лучше понимать контекст"
                          className="delez-scrollbar w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 pr-11 text-sm text-white/90 outline-none transition placeholder:text-white/25 focus:border-white/25 focus:bg-white/[0.06]"
                        />
                        <button
                          type="button"
                          onClick={handleBioVoiceInput}
                          title={isBioListening ? "Остановить запись" : "Голосовой ввод"}
                          className={`absolute bottom-3 right-3 rounded-lg p-1.5 transition ${
                            isBioListening
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "text-white/30 hover:bg-white/[0.06] hover:text-white/60"
                          }`}
                        >
                          {isBioListening ? <Mic className="size-4" /> : <MicOff className="size-4" />}
                        </button>
                        {isBioListening && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-lg bg-emerald-500 px-3 py-1 text-xs font-medium text-black shadow-lg"
                          >
                            Говорите...
                          </motion.div>
                        )}
                      </div>
                    </label>
                  </motion.div>
                )}

                {section === "security" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-5"
                  >
                    <div>
                      <h2 className="text-lg font-semibold">Смена пароля</h2>
                      <p className="mt-1 text-sm text-white/40">Минимум 6 символов</p>
                    </div>
                    <div className="max-w-md space-y-3">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">Текущий пароль</span>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className={inputCls}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">Новый пароль</span>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className={inputCls}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">Подтверждение</span>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={inputCls}
                        />
                      </label>
                    </div>
                  </motion.div>
                )}

                {section === "assistant" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-lg font-semibold">Стиль ИИ-ассистента</h2>
                      <p className="mt-1 text-sm text-white/40">
                        Определите как ассистент будет общаться с вами в чате
                      </p>
                    </div>

                    {/* Tone */}
                    <div>
                      <span className="mb-2.5 block text-xs font-medium uppercase tracking-wider text-white/40">Тон общения</span>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {TONE_PRESETS.map((preset) => {
                          const active = assistantTone === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setAssistantTone(preset.id)}
                              className={`group relative rounded-xl border px-3.5 py-3 text-left transition ${
                                active
                                  ? "border-emerald-500/30 bg-emerald-500/[0.08]"
                                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`size-3.5 rounded-full border-2 transition ${
                                  active ? "border-emerald-400 bg-emerald-400" : "border-white/20"
                                }`}>
                                  {active && <Check className="size-2.5 text-black" style={{ margin: "-1px" }} />}
                                </div>
                                <span className={`text-sm font-medium ${active ? "text-emerald-400" : "text-white/70"}`}>
                                  {preset.label}
                                </span>
                              </div>
                              <p className="mt-1 pl-5.5 text-xs text-white/35">{preset.desc}</p>
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setAssistantTone("custom")}
                          className={`rounded-xl border px-3.5 py-3 text-left transition ${
                            assistantTone === "custom"
                              ? "border-emerald-500/30 bg-emerald-500/[0.08]"
                              : "border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`size-3.5 rounded-full border-2 transition ${
                              assistantTone === "custom" ? "border-emerald-400 bg-emerald-400" : "border-white/20"
                            }`}>
                              {assistantTone === "custom" && <Check className="size-2.5 text-black" style={{ margin: "-1px" }} />}
                            </div>
                            <span className={`text-sm font-medium ${assistantTone === "custom" ? "text-emerald-400" : "text-white/70"}`}>
                              Свой
                            </span>
                          </div>
                          <p className="mt-1 pl-5.5 text-xs text-white/35">Опишите свой стиль</p>
                        </button>
                      </div>
                      {assistantTone === "custom" && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2">
                          <input
                            value={customTone}
                            onChange={(e) => setCustomTone(e.target.value)}
                            placeholder="Например: дружелюбный, но требовательный"
                            className={inputCls}
                          />
                        </motion.div>
                      )}
                    </div>

                    {/* Role */}
                    <div>
                      <span className="mb-2.5 block text-xs font-medium uppercase tracking-wider text-white/40">Роль</span>
                      <div className="grid grid-cols-2 gap-2">
                        {ROLE_PRESETS.map((preset) => {
                          const active = assistantRole === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setAssistantRole(preset.id)}
                              className={`group rounded-xl border px-3.5 py-3 text-left transition ${
                                active
                                  ? "border-emerald-500/30 bg-emerald-500/[0.08]"
                                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`size-3.5 rounded-full border-2 transition ${
                                  active ? "border-emerald-400 bg-emerald-400" : "border-white/20"
                                }`}>
                                  {active && <Check className="size-2.5 text-black" style={{ margin: "-1px" }} />}
                                </div>
                                <span className={`text-sm font-medium ${active ? "text-emerald-400" : "text-white/70"}`}>
                                  {preset.label}
                                </span>
                              </div>
                              <p className="mt-1 pl-5.5 text-xs text-white/35">{preset.desc}</p>
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setAssistantRole("custom")}
                          className={`rounded-xl border px-3.5 py-3 text-left transition col-span-2 sm:col-span-1 ${
                            assistantRole === "custom"
                              ? "border-emerald-500/30 bg-emerald-500/[0.08]"
                              : "border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`size-3.5 rounded-full border-2 transition ${
                              assistantRole === "custom" ? "border-emerald-400 bg-emerald-400" : "border-white/20"
                            }`}>
                              {assistantRole === "custom" && <Check className="size-2.5 text-black" style={{ margin: "-1px" }} />}
                            </div>
                            <span className={`text-sm font-medium ${assistantRole === "custom" ? "text-emerald-400" : "text-white/70"}`}>
                              Своя роль
                            </span>
                          </div>
                          <p className="mt-1 pl-5.5 text-xs text-white/35">Опишите роль свободно</p>
                        </button>
                      </div>
                      {assistantRole === "custom" && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2">
                          <input
                            value={customRole}
                            onChange={(e) => setCustomRole(e.target.value)}
                            placeholder="Например: строгий трекер привычек"
                            className={inputCls}
                          />
                        </motion.div>
                      )}
                    </div>

                    {/* Preview */}
                    {(resolvedTone || resolvedRole) && (
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-white/30">Итого</p>
                        <p className="mt-2 text-sm text-white/70">
                          <span className="text-white/90">{resolvedRole || "—"}</span>
                          {" · "}
                          <span className="text-white/50">{resolvedTone || "—"}</span>
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
                <div className="min-h-5 text-sm">
                  {statusMsg && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={statusIsError ? "text-rose-400" : "text-emerald-400"}
                    >
                      {statusMsg}
                    </motion.span>
                  )}
                </div>
                <div className="flex gap-2">
                  {section === "profile" && (
                    <button
                      type="button"
                      onClick={saveProfile}
                      disabled={saving}
                      className="flex items-center gap-2 rounded-xl bg-white/[0.08] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.14] disabled:opacity-50"
                    >
                      <Save className="size-4" />
                      {saving ? "Сохраняем..." : "Сохранить"}
                    </button>
                  )}
                  {section === "security" && (
                    <button
                      type="button"
                      onClick={handleChangePassword}
                      disabled={securitySaving}
                      className="flex items-center gap-2 rounded-xl bg-white/[0.08] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.14] disabled:opacity-50"
                    >
                      <Shield className="size-4" />
                      {securitySaving ? "Сохраняем..." : "Сменить пароль"}
                    </button>
                  )}
                  {section === "assistant" && (
                    <button
                      type="button"
                      onClick={handleSaveAssistant}
                      className="flex items-center gap-2 rounded-xl bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/25"
                    >
                      <Sparkles className="size-4" />
                      Сохранить стиль
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
