import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Globe2, Lock, Sparkles } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import RadialPulseLoader from "@/components/ui/loading-animation";
import { memoirsApi } from "@/lib/api-client";

type MemoirsTab = "public" | "private";

interface PublicMemoirItem {
  id: string;
  title: string;
  description: string;
  author_id: string;
  created_at: string;
  likes: number;
}

interface PrivateStory {
  title: string;
  narrative: string;
  timeline_points: string[];
}

interface MemoirRecommendation {
  title: string;
  description: string;
}

function shortText(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

export default function MemoirsPage() {
  const [activeTab, setActiveTab] = useState<MemoirsTab>("public");
  const [publicFeed, setPublicFeed] = useState<PublicMemoirItem[]>([]);
  const [privateStory, setPrivateStory] = useState<PrivateStory | null>(null);
  const [recommendations, setRecommendations] = useState<MemoirRecommendation[]>([]);
  const [storyPeriod, setStoryPeriod] = useState<"month" | "year" | "all">("all");
  const [publishTitle, setPublishTitle] = useState<string>("");
  const [publishContent, setPublishContent] = useState<string>("");
  const [publishSaving, setPublishSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([memoirsApi.getPublicFeed(), memoirsApi.getPrivateStory("all"), memoirsApi.getRecommendations()])
      .then(([publicData, privateData, recommendationsData]) => {
        setPublicFeed(
          publicData.items.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.content,
            author_id: item.author_id,
            created_at: item.created_at,
            likes: item.likes,
          })),
        );
        setPrivateStory(privateData);
        setRecommendations(recommendationsData.items);
      })
      .catch(() => {
        setError("Не удалось загрузить данные мемуаров");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (activeTab !== "private") return;
    memoirsApi
      .getPrivateStory(storyPeriod)
      .then((data) => {
        setPrivateStory(data);
      })
      .catch(() => {
        setError("Не удалось обновить приватную историю");
      });
  }, [activeTab, storyPeriod]);

  const handlePublish = (): void => {
    const title = publishTitle.trim();
    const content = publishContent.trim();
    if (!title || !content) {
      setError("Заполни заголовок и текст публичного мемуара");
      return;
    }
    setPublishSaving(true);
    memoirsApi
      .createPublicMemoir({ title, content })
      .then((created) => {
        setPublicFeed((prev) => [
          {
            id: created.id,
            title: created.title,
            description: created.content,
            author_id: created.author_id,
            created_at: created.created_at,
            likes: created.likes,
          },
          ...prev,
        ]);
        setPublishTitle("");
        setPublishContent("");
      })
      .catch(() => {
        setError("Не удалось опубликовать мемуар");
      })
      .finally(() => {
        setPublishSaving(false);
      });
  };

  const updateMemoirLikes = (memoirId: string, newLikes: number): void => {
    setPublicFeed((prev) => 
      prev.map((item) => 
        item.id === memoirId ? { ...item, likes: newLikes } : item
      )
    );
  };

  const handleLike = (memoirId: string): void => {
    memoirsApi
      .likePublicMemoir(memoirId)
      .then((updated) => {
        updateMemoirLikes(memoirId, updated.likes);
      })
      .catch(() => {
        setError("Не удалось поставить лайк");
      });
  };

  const memoirStats = useMemo(() => {
    const timelineCount = privateStory?.timeline_points.length ?? 0;
    const publicCount = publicFeed.length;
    const likesCount = publicFeed.reduce((sum, item) => sum + item.likes, 0);
    return { timelineCount, publicCount, likesCount };
  }, [privateStory, publicFeed]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#000019]">
        <RadialPulseLoader text="Загрузка раздела Мемуары..." size={120} color="#ffffff" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000019] text-white">
      <div className="flex items-start justify-between px-8 pt-8 pb-6">
        <div>
          <Breadcrumbs crumbs={[{ label: "Главная", to: "/navigation" }, { label: "Мемуары" }]} />
          <h1 className="mt-2 mb-1 text-4xl font-bold">Мемуары</h1>
          <p className="text-sm text-gray-500">Публичная и приватная хроника жизненного пути</p>
        </div>
        <Link
          to="/report"
          className="rounded-xl px-5 py-2.5 text-sm font-medium transition-all hover:opacity-90"
          style={{ background: "rgba(255,255,255,0.9)", color: "#000" }}
        >
          Итоговый отчёт
        </Link>
      </div>

      <div className="px-8 pb-8">
        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>
        ) : null}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "public", label: "Публичные мемуары", icon: Globe2 },
              { id: "private", label: "Приватные мемуары", icon: Lock },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === (tab.id as MemoirsTab);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as MemoirsTab)}
                  className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition-all"
                  style={{
                    border: isActive ? "1px solid rgba(255,255,255,0.25)" : "1px solid transparent",
                    background: isActive ? "rgba(255,255,255,0.10)" : "transparent",
                    color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                  }}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-8 pb-16">
        {activeTab === "public" ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-lg font-semibold">Публичные мемуары</h2>
              <p className="mt-2 text-sm text-gray-400">Публикуй личные истории, формируй коллективную хронику и получай отклик сообщества.</p>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <input
                  value={publishTitle}
                  onChange={(event) => setPublishTitle(event.target.value)}
                  placeholder="Заголовок истории"
                  className="h-10 rounded-xl border border-white/15 bg-[#070b22]/90 px-3 text-sm outline-none"
                />
                <textarea
                  rows={4}
                  value={publishContent}
                  onChange={(event) => setPublishContent(event.target.value)}
                  placeholder="Какой эпизод ты хочешь оставить в публичной хронике?"
                  className="rounded-xl border border-white/15 bg-[#070b22]/90 px-3 py-2 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishSaving}
                  className="w-fit rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20 disabled:opacity-50"
                >
                  {publishSaving ? "Публикуем..." : "Опубликовать"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {publicFeed.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border p-4"
                  style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}
                >
                  <p className="text-sm font-semibold">{entry.title}</p>
                  <p className="mt-2 text-sm text-gray-400">{shortText(entry.description, 140)}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500">{new Date(entry.created_at).toLocaleString("ru-RU")}</span>
                    <button
                      type="button"
                      onClick={() => handleLike(entry.id)}
                      className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs transition hover:bg-white/10"
                    >
                      ❤ {entry.likes}
                    </button>
                  </div>
                </div>
              ))}
              {publicFeed.length === 0 ? <p className="text-sm text-gray-500">Пока нет публичных мемуаров.</p> : null}
            </div>
          </div>
        ) : null}

        {activeTab === "private" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {[
                { label: "Пунктов хронологии", value: String(memoirStats.timelineCount) },
                { label: "Публичных историй", value: String(memoirStats.publicCount) },
                { label: "Всего реакций", value: String(memoirStats.likesCount) },
                { label: "Рекомендаций ИИ", value: String(recommendations.length) },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border p-5"
                  style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}
                >
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-bold">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-2 text-xs text-gray-500">Период автосборки истории</p>
              <div className="flex gap-2">
                {[
                  { id: "month", label: "Месяц" },
                  { id: "year", label: "Год" },
                  { id: "all", label: "Всё время" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStoryPeriod(item.id as "month" | "year" | "all")}
                    className="rounded-xl border px-3 py-1.5 text-xs transition"
                    style={{
                      borderColor: storyPeriod === item.id ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
                      background: storyPeriod === item.id ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border p-5" style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Sparkles size={16} />
                <span>{privateStory?.title ?? "Автосборка приватной хронологии"}</span>
              </div>
              <p className="mt-2 text-sm text-gray-300">{privateStory?.narrative ?? "Нет данных для нарратива."}</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-400">
                {(privateStory?.timeline_points ?? []).map((point) => (
                  <li key={point}>{point}</li>
                ))}
                {(privateStory?.timeline_points ?? []).length === 0 ? <li>Нет данных для построения хронологии.</li> : null}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="mb-2 text-sm font-semibold">Рекомендательные сценарии ИИ по изменению курса</p>
              <ul className="space-y-2 text-sm text-gray-300">
                {recommendations.map((item) => (
                  <li key={item.title} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-xs text-gray-400">{item.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
