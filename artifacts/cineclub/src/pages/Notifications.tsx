import { PageTransition } from "@/components/PageTransition";
import { useGetNotifications, useMarkAllNotificationsRead, useMarkNotificationRead, getGetNotificationsQueryKey } from "@workspace/api-client-react";
import { Bell, Check, UserPlus, UserCheck, Film, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";

type NotifData = Record<string, unknown>;

interface NotifContent {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string | null;
  posterUrl: string | null;
  rating: number | null;
}

function getNotifContent(type: string, raw: unknown, t: (k: string) => string): NotifContent {
  const data: NotifData = raw && typeof raw === "object" ? (raw as NotifData) : {};
  const name = String(data.fromDisplayName ?? data.fromUsername ?? "?");
  const username = String(data.fromUsername ?? "?");
  const movie = String(data.movieTitle ?? "");
  const rating = data.rating != null && data.rating !== "" ? Number(data.rating) : null;
  const posterPath = data.moviePosterPath ? String(data.moviePosterPath) : null;
  const posterUrl = posterPath ? `https://image.tmdb.org/t/p/w92${posterPath}` : null;

  switch (type) {
    case "friend_request":
      return {
        icon: <UserPlus size={18} />,
        iconBg: "bg-blue-600/20 text-blue-400 border border-blue-800/40",
        title: t("notifFriendRequest").replace("{name}", name || `@${username}`),
        subtitle: null,
        posterUrl: null,
        rating: null,
      };
    case "friend_accept":
      return {
        icon: <UserCheck size={18} />,
        iconBg: "bg-emerald-600/20 text-emerald-400 border border-emerald-800/40",
        title: t("notifFriendAccept").replace("{name}", name || `@${username}`),
        subtitle: null,
        posterUrl: null,
        rating: null,
      };
    case "recommendation":
      return {
        icon: <Film size={18} />,
        iconBg: "bg-amber-600/20 text-amber-400 border border-amber-800/40",
        title: t("notifRecommendation")
          .replace("{name}", name || `@${username}`)
          .replace("{movie}", movie),
        subtitle: rating != null ? `${t("notifRating")} ${rating}/10` : null,
        posterUrl,
        rating,
      };
    default:
      return {
        icon: <Bell size={18} />,
        iconBg: "bg-gray-700/30 text-gray-400 border border-gray-700/40",
        title: t("newActivity"),
        subtitle: null,
        posterUrl: null,
        rating: null,
      };
  }
}

function RatingStars({ rating }: { rating: number }) {
  const full = Math.floor(rating / 2);
  const half = (rating / 2) % 1 >= 0.5;
  return (
    <span className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={11}
          className={i < full ? "fill-amber-400 text-amber-400" : i === full && half ? "fill-amber-400/50 text-amber-400" : "text-gray-700"}
        />
      ))}
      <span className="text-xs text-amber-400 font-medium ml-1">{rating}/10</span>
    </span>
  );
}

function timeAgo(iso: string, lang: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  const labels: Record<string, Record<string, string>> = {
    tr: { justNow: "Az önce", minsAgo: "{n} dk önce", hoursAgo: "{n} sa önce", daysAgo: "{n} gün önce" },
    en: { justNow: "Just now", minsAgo: "{n}m ago", hoursAgo: "{n}h ago", daysAgo: "{n}d ago" },
    de: { justNow: "Gerade eben", minsAgo: "Vor {n} Min", hoursAgo: "Vor {n} Std", daysAgo: "Vor {n} Tag(en)" },
    es: { justNow: "Ahora mismo", minsAgo: "Hace {n} min", hoursAgo: "Hace {n} h", daysAgo: "Hace {n} días" },
    fr: { justNow: "À l'instant", minsAgo: "Il y a {n} min", hoursAgo: "Il y a {n} h", daysAgo: "Il y a {n} j" },
  };
  const l = labels[lang] ?? labels.en;
  if (mins < 1) return l.justNow;
  if (mins < 60) return l.minsAgo.replace("{n}", String(mins));
  if (hours < 24) return l.hoursAgo.replace("{n}", String(hours));
  return l.daysAgo.replace("{n}", String(days));
}

export default function Notifications() {
  const { t, lang } = useLang();
  const { data: notifications, isLoading } = useGetNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const queryClient = useQueryClient();

  const handleMarkRead = (id: number) => {
    markRead.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() })
    });
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() })
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-10 w-48 bg-[#111] mb-8" />
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full bg-[#111] rounded-xl" />)}
      </div>
    );
  }

  const hasUnread = notifications?.some(n => !n.read);

  return (
    <PageTransition className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">{t("notificationsTitle")}</h1>
          <p className="text-gray-400">{t("activityFromClub")}</p>
        </div>
        {hasUnread && (
          <Button onClick={handleMarkAllRead} variant="ghost" className="text-gray-400 hover:text-white hover:bg-gray-800">
            <Check size={16} className="mr-2" /> {t("markAllRead")}
          </Button>
        )}
      </div>

      {notifications && notifications.length > 0 ? (
        <div className="space-y-2 bg-[#111] border border-gray-800 rounded-3xl p-2">
          {notifications.map(notif => {
            const content = getNotifContent(notif.type, notif.data, t);
            return (
              <div
                key={notif.id}
                className={`p-4 rounded-2xl flex items-start gap-4 transition-all cursor-pointer ${notif.read ? "opacity-50" : "bg-white/[0.03] hover:bg-white/[0.06]"}`}
                onClick={() => !notif.read && handleMarkRead(notif.id)}
              >
                {/* Icon */}
                <div className={`mt-0.5 shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center ${content.iconBg}`}>
                  {content.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-100 leading-snug">{content.title}</p>
                  {content.rating != null && (
                    <div className="mt-1.5">
                      <RatingStars rating={content.rating} />
                    </div>
                  )}
                  {content.subtitle && !content.rating && (
                    <p className="text-xs text-gray-500 mt-1">{content.subtitle}</p>
                  )}
                  <p className="text-xs text-gray-600 mt-1.5">
                    {timeAgo(notif.createdAt, lang)}
                  </p>
                </div>

                {/* Poster thumbnail (recommendations only) */}
                {content.posterUrl && (
                  <div className="shrink-0 w-10 h-[60px] rounded-lg overflow-hidden bg-gray-800 border border-gray-700">
                    <img src={content.posterUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Unread dot */}
                {!notif.read && (
                  <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-2 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-[#0a0a0a] rounded-3xl border border-dashed border-gray-800">
          <Bell className="mx-auto text-gray-700 mb-4" size={48} />
          <h3 className="text-xl font-bold text-gray-300 mb-2">{t("allCaughtUp")}</h3>
          <p className="text-gray-500">{t("noNotificationsDesc")}</p>
        </div>
      )}
    </PageTransition>
  );
}
