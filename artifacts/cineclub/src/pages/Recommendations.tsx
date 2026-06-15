import { useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { useGetRecommendationInbox, useMarkRecommendationRead, getGetRecommendationInboxQueryKey } from "@workspace/api-client-react";
import { MessageSquare, Check, User, Star, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { getPosterUrl } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";
import { getAuthToken } from "@/lib/auth-token";

type SentRec = {
  id: number;
  tmdbId: number;
  message: string | null;
  rating: string | null;
  seen: boolean;
  createdAt: string;
  movie: { tmdbId: number; title: string; posterPath: string | null };
  toUser: { username: string; displayName: string | null; avatarUrl: string | null } | null;
};

export default function Recommendations() {
  const { t } = useLang();
  const [tab, setTab] = useState<"received" | "sent">("received");

  const { data: recs, isLoading } = useGetRecommendationInbox();
  const markRead = useMarkRecommendationRead();
  const queryClient = useQueryClient();

  const { data: sent, isLoading: loadingSent } = useQuery<SentRec[]>({
    queryKey: ["recommendations", "sent"],
    queryFn: async () => {
      const token = getAuthToken();
      const res = await fetch("/api/recommendations/sent", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const handleMarkRead = (id: number) => {
    markRead.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetRecommendationInboxQueryKey() });
        toast.success(t("markedSeen"));
      },
    });
  };

  const unreadCount = recs?.filter(r => !r.seen).length ?? 0;

  return (
    <PageTransition className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">{t("recommendationsTitle")}</h1>

        <div className="flex mt-6 bg-[#111] border border-gray-800 rounded-2xl p-1 gap-1 w-fit">
          <button
            onClick={() => setTab("received")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === "received" ? "bg-gradient-to-r from-amber-500 to-red-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.3)]" : "text-gray-400 hover:text-white"}`}
          >
            <MessageSquare size={15} />
            {t("receivedRecommendations")}
            {unreadCount > 0 && (
              <span className={`rounded-full text-xs px-1.5 py-0.5 leading-none ${tab === "received" ? "bg-black/20 text-black" : "bg-red-500 text-white"}`}>{unreadCount}</span>
            )}
          </button>
          <button
            onClick={() => setTab("sent")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === "sent" ? "bg-gradient-to-r from-amber-500 to-red-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.3)]" : "text-gray-400 hover:text-white"}`}
          >
            <Send size={15} />
            {t("sentRecommendations")}
            {sent && sent.length > 0 && (
              <span className={`text-xs ${tab === "sent" ? "text-black/60" : "text-gray-500"}`}>{sent.length}</span>
            )}
          </button>
        </div>
      </div>

      {tab === "received" && (
        <>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full bg-[#111] rounded-2xl" />)}
            </div>
          ) : recs && recs.length > 0 ? (
            <div className="space-y-4">
              {recs.map(rec => (
                <div key={rec.id} className={`bg-[#111] border ${rec.seen ? "border-gray-800/50 opacity-70" : "border-amber-500/30"} rounded-2xl p-5 flex flex-col md:flex-row gap-6 relative overflow-hidden group`}>
                  <Link href={`/movie/${rec.tmdbId}`}>
                    <div className="w-24 md:w-32 aspect-[2/3] shrink-0 rounded-xl overflow-hidden bg-gray-900 border border-gray-800 shadow-xl cursor-pointer hover:scale-105 transition-transform">
                      <img src={getPosterUrl(rec.movie.posterPath)} alt={rec.movie.title} className="w-full h-full object-cover" />
                    </div>
                  </Link>

                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden flex items-center justify-center shrink-0">
                        {rec.fromUser?.avatarUrl ? (
                          <img src={rec.fromUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={16} className="text-gray-500" />
                        )}
                      </div>
                      <div className="text-sm text-gray-400">
                        <span className="font-bold text-white">{rec.fromUser?.displayName || rec.fromUser?.username}</span>{" "}
                        {t("recommendedBy")}
                      </div>
                      <div className="text-xs text-gray-600 ml-auto">{new Date(rec.createdAt).toLocaleDateString()}</div>
                    </div>

                    <Link href={`/movie/${rec.tmdbId}`}>
                      <h3 className="font-bold text-2xl mb-2 hover:text-amber-500 transition-colors cursor-pointer">{rec.movie.title}</h3>
                    </Link>

                    {(rec as any).rating && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="flex items-center gap-1 bg-black/50 px-2.5 py-1 rounded-lg border border-amber-500/20">
                          <Star size={13} className="text-amber-500 fill-amber-500" />
                          <span className="font-bold text-amber-400 text-sm">{(rec as any).rating}</span>
                          <span className="text-gray-600 text-xs">/10</span>
                        </div>
                      </div>
                    )}

                    {rec.message && (
                      <div className="bg-black/50 p-4 rounded-xl border border-gray-800/50 mt-2 flex-1">
                        <p className="text-gray-300 italic">"{rec.message}"</p>
                      </div>
                    )}

                    {!rec.seen && (
                      <div className="mt-4 flex justify-end">
                        <Button onClick={() => handleMarkRead(rec.id)} variant="outline" className="bg-transparent border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800">
                          <Check size={16} className="mr-2" /> {t("markSeen")}
                        </Button>
                      </div>
                    )}
                  </div>

                  {!rec.seen && <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-500/20 to-transparent pointer-events-none" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-[#0a0a0a] rounded-3xl border border-dashed border-gray-800">
              <MessageSquare className="mx-auto text-gray-700 mb-4" size={48} />
              <h3 className="text-xl font-bold text-gray-300 mb-2">{t("noRecommendations")}</h3>
              <p className="text-gray-500">{t("noRecommendationsDesc")}</p>
            </div>
          )}
        </>
      )}

      {tab === "sent" && (
        <>
          {loadingSent ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-36 w-full bg-[#111] rounded-2xl" />)}
            </div>
          ) : sent && sent.length > 0 ? (
            <div className="space-y-4">
              {sent.map(rec => (
                <div key={rec.id} className={`bg-[#111] border ${rec.seen ? "border-green-800/40" : "border-gray-800"} rounded-2xl p-5 flex gap-5 relative overflow-hidden`}>
                  <Link href={`/movie/${rec.tmdbId}`}>
                    <div className="w-20 md:w-24 aspect-[2/3] shrink-0 rounded-lg overflow-hidden bg-gray-900 border border-gray-800 cursor-pointer hover:scale-105 transition-transform">
                      <img src={getPosterUrl(rec.movie.posterPath)} alt={rec.movie.title} className="w-full h-full object-cover" />
                    </div>
                  </Link>

                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-gray-800 overflow-hidden flex items-center justify-center shrink-0">
                        {rec.toUser?.avatarUrl ? (
                          <img src={rec.toUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={12} className="text-gray-500" />
                        )}
                      </div>
                      <span className="text-sm text-gray-400">
                        <span className="font-semibold text-white">@{rec.toUser?.username}</span>{" "}
                        {t("recommendedTo")}
                      </span>
                      <div className="text-xs text-gray-600 ml-auto">{new Date(rec.createdAt).toLocaleDateString()}</div>
                    </div>

                    <Link href={`/movie/${rec.tmdbId}`}>
                      <h3 className="font-bold text-xl mb-2 hover:text-amber-500 transition-colors cursor-pointer">{rec.movie.title}</h3>
                    </Link>

                    {rec.rating && (
                      <div className="flex items-center gap-1 mb-2 w-fit bg-black/50 px-2.5 py-1 rounded-lg border border-amber-500/20">
                        <Star size={12} className="text-amber-500 fill-amber-500" />
                        <span className="font-bold text-amber-400 text-sm">{rec.rating}</span>
                        <span className="text-gray-600 text-xs">/10</span>
                      </div>
                    )}

                    {rec.message && (
                      <p className="text-gray-400 text-sm italic mt-1">"{rec.message}"</p>
                    )}

                    <div className="mt-auto pt-2 flex items-center gap-1.5">
                      {rec.seen ? (
                        <span className="text-xs text-green-500 flex items-center gap-1"><Check size={12} /> {t("seen")}</span>
                      ) : (
                        <span className="text-xs text-gray-600">{t("notYetSeen")}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-[#0a0a0a] rounded-3xl border border-dashed border-gray-800">
              <Send className="mx-auto text-gray-700 mb-4" size={48} />
              <h3 className="text-xl font-bold text-gray-300 mb-2">{t("sentRecommendations")}</h3>
              <p className="text-gray-500">{t("noRecommendationsDesc")}</p>
            </div>
          )}
        </>
      )}
    </PageTransition>
  );
}
