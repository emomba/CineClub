import { PageTransition } from "@/components/PageTransition";
import { useGetMe, useUpdateMe, useGetUserReviews, getGetUserReviewsQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Settings, Save, Film } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "wouter";
import { useLang } from "@/lib/i18n";
import { getPosterUrl } from "@/lib/tmdb";

type WatchedMovie = {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  voteAverage: number;
};

function WatchedScroll({ movies }: { movies: WatchedMovie[] }) {
  if (!movies.length) return null;
  return (
    <div className="flex gap-3 overflow-x-auto pb-3 snap-x scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
      {movies.map(m => (
        <Link key={m.tmdbId} href={`/movie/${m.tmdbId}`}>
          <div className="w-28 shrink-0 snap-start group cursor-pointer">
            <div className="aspect-[2/3] rounded-xl overflow-hidden bg-gray-900 border border-gray-800 group-hover:border-amber-500/50 group-hover:shadow-[0_4px_16px_rgba(245,158,11,0.2)] transition-all duration-300">
              <img src={getPosterUrl(m.posterPath)} alt={m.title} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-1 group-hover:text-gray-300 transition-colors px-0.5">{m.title}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function Profile() {
  const { t } = useLang();
  const { data: user, isLoading } = useGetMe();
  const updateMe = useUpdateMe();
  const queryClient = useQueryClient();

  const { data: reviews } = useGetUserReviews(user?.clerkId || "", {
    query: { enabled: !!user?.clerkId, queryKey: getGetUserReviewsQueryKey(user?.clerkId || "") },
  });

  const { data: watchedMovies = [] } = useQuery<WatchedMovie[]>({
    queryKey: ["watched", user?.username],
    queryFn: async () => {
      const res = await fetch(`/api/users/${user!.username}/watched`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.username,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ displayName: "", username: "", bio: "", avatarUrl: "" });

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || "",
        username: user.username || "",
        bio: user.bio || "",
        avatarUrl: user.avatarUrl || "",
      });
    }
  }, [user]);

  const handleSave = () => {
    updateMe.mutate({ data: formData }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setIsEditing(false);
        toast.success(t("saveChanges"));
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || "Error");
      },
    });
  };

  const favoriteMovies = reviews
    ? [...reviews].sort((a, b) => Number(b.rating) - Number(a.rating)).slice(0, 8)
    : [];

  if (isLoading) {
    return <div className="max-w-3xl mx-auto"><Skeleton className="h-64 w-full bg-[#111] rounded-3xl" /></div>;
  }

  return (
    <PageTransition className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">{t("yourProfile")}</h1>
        <p className="text-gray-400">{t("manageIdentity")}</p>
      </div>

      <div className="bg-[#111] border border-gray-800 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { if (isEditing) handleSave(); else setIsEditing(true); }}
            disabled={isEditing && updateMe.isPending}
            className={`border-gray-700 bg-black/50 backdrop-blur-md text-white hover:bg-gray-800 ${isEditing ? "border-amber-500 text-amber-500" : ""}`}
          >
            {isEditing ? (
              <><Save size={16} className="mr-2" />{updateMe.isPending ? t("saving") : t("saveChanges")}</>
            ) : (
              <><Settings size={16} className="mr-2" />{t("editProfile")}</>
            )}
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-32 h-32 rounded-full border-4 border-gray-800 bg-gray-900 overflow-hidden shrink-0 flex items-center justify-center">
            {formData.avatarUrl || user?.avatarUrl ? (
              <img src={isEditing ? formData.avatarUrl : user?.avatarUrl!} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={48} className="text-gray-600" />
            )}
          </div>

          <div className="flex-1 space-y-4 w-full">
            {isEditing ? (
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-1 block">{t("displayName")}</label>
                  <Input value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} className="bg-black border-gray-800 focus-visible:ring-amber-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-1 block">{t("username")}</label>
                  <Input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="bg-black border-gray-800 focus-visible:ring-amber-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-1 block">{t("avatarUrl")}</label>
                  <Input value={formData.avatarUrl} onChange={e => setFormData({...formData, avatarUrl: e.target.value})} className="bg-black border-gray-800 focus-visible:ring-amber-500" placeholder="https://..." />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-1 block">{t("bio")}</label>
                  <Textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="bg-black border-gray-800 focus-visible:ring-amber-500 resize-none h-24" />
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <h2 className="text-3xl font-bold tracking-tight mb-1">{user?.displayName || user?.username}</h2>
                <p className="text-amber-500 font-medium mb-4">@{user?.username}</p>
                <p className="text-gray-300 max-w-xl leading-relaxed">{user?.bio || "..."}</p>
              </div>
            )}
          </div>
        </div>

        {!isEditing && (
          <div className="grid grid-cols-3 gap-4 mt-10 pt-8 border-t border-gray-800">
            <div className="bg-black/50 rounded-2xl p-4 text-center border border-gray-800/50">
              <div className="text-3xl font-bold text-white mb-1">{watchedMovies.length || user?.watchedCount || 0}</div>
              <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">{t("moviesWatched")}</div>
            </div>
            <div className="bg-black/50 rounded-2xl p-4 text-center border border-gray-800/50">
              <div className="text-3xl font-bold text-white mb-1">{user?.reviewCount || 0}</div>
              <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">{t("reviewsWritten")}</div>
            </div>
            <div className="bg-black/50 rounded-2xl p-4 text-center border border-gray-800/50">
              <div className="text-3xl font-bold text-white mb-1">{user?.friendCount || 0}</div>
              <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">{t("friendsCount")}</div>
            </div>
          </div>
        )}
      </div>

      {!isEditing && watchedMovies.length > 0 && (
        <div>
          <h3 className="text-2xl font-bold mb-5 flex items-center gap-2">
            <Film size={22} className="text-amber-500" />
            {t("watchedMoviesSection")}
            <span className="text-gray-600 font-normal text-lg">({watchedMovies.length})</span>
          </h3>
          <WatchedScroll movies={watchedMovies} />
        </div>
      )}

      {!isEditing && favoriteMovies.length > 0 && (
        <div>
          <h3 className="text-2xl font-bold mb-5 flex items-center gap-2">
            <span className="text-amber-500">★</span>
            {t("favoriteMovies")}
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-3 snap-x">
            {favoriteMovies.map(review => (
              <Link key={review.id} href={`/movie/${review.tmdbId}`}>
                <div className="w-28 shrink-0 snap-start group cursor-pointer">
                  <div className="aspect-[2/3] rounded-xl overflow-hidden bg-gray-900 border border-amber-500/30 group-hover:border-amber-500 group-hover:shadow-[0_4px_16px_rgba(245,158,11,0.25)] transition-all duration-300 relative">
                    {review.moviePosterPath ? (
                      <img src={`https://image.tmdb.org/t/p/w200${review.moviePosterPath}`} alt={review.movieTitle || ""} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-900"><Film size={24} className="text-gray-700" /></div>
                    )}
                    <div className="absolute bottom-1 right-1 bg-black/80 rounded-md px-1.5 py-0.5 text-xs font-bold text-amber-400">
                      ★{review.rating}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 line-clamp-1 group-hover:text-gray-300 transition-colors px-0.5">{review.movieTitle}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!isEditing && reviews && reviews.length > 0 && (
        <div className="pt-4">
          <h3 className="text-2xl font-bold mb-6">{t("yourRecentReviews")}</h3>
          <div className="space-y-4">
            {reviews.slice(0, 5).map(review => (
              <Link key={review.id} href={`/movie/${review.tmdbId}`}>
                <div className="bg-[#111] border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors cursor-pointer group flex flex-col md:flex-row gap-6">
                  {review.moviePosterPath && (
                    <img src={`https://image.tmdb.org/t/p/w200${review.moviePosterPath}`} className="w-24 rounded-lg object-cover shadow-lg border border-gray-800 group-hover:border-amber-500/50 transition-colors" alt="" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-bold text-xl mb-2 group-hover:text-amber-500 transition-colors">{review.movieTitle}</h4>
                    <p className="text-gray-400 line-clamp-2 leading-relaxed">{review.content}</p>
                  </div>
                  <div className="text-xl font-bold text-amber-500 shrink-0">★ {review.rating}<span className="text-gray-600 text-sm">/10</span></div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </PageTransition>
  );
}
