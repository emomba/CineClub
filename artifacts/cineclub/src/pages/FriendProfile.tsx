import { useParams } from "wouter";
import { PageTransition } from "@/components/PageTransition";
import { useGetUserByUsername, useGetUserReviews, getGetUserByUsernameQueryKey, getGetUserReviewsQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Film, Star, MessageSquare, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { useLang } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { getAuthToken } from "@/lib/auth-token";
import { getPosterUrl } from "@/lib/tmdb";

type WatchedMovie = {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  voteAverage: number;
};

function WatchedScroll({ movies, label }: { movies: WatchedMovie[]; label: string }) {
  if (!movies.length) return null;
  return (
    <div>
      <h2 className="text-2xl font-bold mb-5 flex items-center gap-2">
        <Film size={22} className="text-amber-500" />
        {label}
        <span className="text-gray-600 font-normal text-lg">({movies.length})</span>
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-3 snap-x">
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
    </div>
  );
}

export default function FriendProfile() {
  const { t } = useLang();
  const { userId: username } = useParams<{ userId: string }>();

  const { data: user, isLoading: loadingUser } = useGetUserByUsername(username, {
    query: { enabled: !!username, queryKey: getGetUserByUsernameQueryKey(username) },
  });

  const { data: reviews, isLoading: loadingReviews } = useGetUserReviews(user?.clerkId || "", {
    query: { enabled: !!user?.clerkId, queryKey: getGetUserReviewsQueryKey(user?.clerkId || "") },
  });

  const { data: watchedMovies = [] } = useQuery<WatchedMovie[]>({
    queryKey: ["watched", username],
    queryFn: async () => {
      const res = await fetch(`/api/users/${username}/watched`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!username,
  });

  const { data: overlap } = useQuery<{ commonWatched: WatchedMovie[] }>({
    queryKey: ["overlap", username],
    queryFn: async () => {
      const token = getAuthToken();
      const res = await fetch(`/api/users/${username}/overlap`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return { commonWatched: [] };
      return res.json();
    },
    enabled: !!username,
  });

  if (loadingUser) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <Skeleton className="h-40 w-full bg-[#111] rounded-2xl" />
        <Skeleton className="h-64 w-full bg-[#111] rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return <div className="text-center py-20 text-gray-500">{t("userNotFound")}</div>;
  }

  const commonWatched = overlap?.commonWatched ?? [];

  return (
    <PageTransition className="space-y-10 max-w-5xl mx-auto">
      <div className="relative pt-20 px-8 pb-8 bg-[#111] rounded-3xl border border-gray-800 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-amber-500/20 to-red-500/20" />

        <div className="relative flex flex-col md:flex-row gap-6 items-start md:items-end -mt-12">
          <div className="w-32 h-32 rounded-full border-4 border-[#111] bg-gray-900 overflow-hidden shrink-0 flex items-center justify-center shadow-xl">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <User size={48} className="text-gray-600" />
            )}
          </div>

          <div className="flex-1 pb-2">
            <h1 className="text-3xl font-bold tracking-tight">{user.displayName || user.username}</h1>
            <p className="text-amber-500 font-medium mb-3">@{user.username}</p>
            {user.bio && <p className="text-gray-300 max-w-2xl">{user.bio}</p>}
          </div>

          <div className="flex gap-4 pb-2 shrink-0 w-full md:w-auto">
            <div className="text-center bg-black/50 px-4 py-3 rounded-xl border border-gray-800 min-w-[72px]">
              <div className="text-2xl font-bold text-white">{watchedMovies.length || user.watchedCount || 0}</div>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">{t("watched")}</div>
            </div>
            <div className="text-center bg-black/50 px-4 py-3 rounded-xl border border-gray-800 min-w-[72px]">
              <div className="text-2xl font-bold text-white">{user.reviewCount || 0}</div>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">{t("reviewsCount")}</div>
            </div>
            {commonWatched.length > 0 && (
              <div className="text-center bg-amber-500/10 px-4 py-3 rounded-xl border border-amber-500/30 min-w-[72px]">
                <div className="text-2xl font-bold text-amber-400">{commonWatched.length}</div>
                <div className="text-xs text-amber-600 font-medium uppercase tracking-wider">Ortak</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {watchedMovies.length > 0 && (
        <WatchedScroll movies={watchedMovies} label={t("theirWatchedMovies")} />
      )}

      {commonWatched.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-5 flex items-center gap-2">
            <Sparkles size={22} className="text-amber-500" />
            {t("commonMovies")}
            <span className="text-gray-600 font-normal text-lg">({commonWatched.length})</span>
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-3 snap-x">
            {commonWatched.map(m => (
              <Link key={m.tmdbId} href={`/movie/${m.tmdbId}`}>
                <div className="w-28 shrink-0 snap-start group cursor-pointer">
                  <div className="aspect-[2/3] rounded-xl overflow-hidden bg-gray-900 border border-amber-500/30 group-hover:border-amber-500 group-hover:shadow-[0_4px_16px_rgba(245,158,11,0.3)] transition-all duration-300">
                    <img src={getPosterUrl(m.posterPath)} alt={m.title} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 line-clamp-1 group-hover:text-gray-300 transition-colors px-0.5">{m.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <MessageSquare size={24} className="text-amber-500" />
          {t("recentReviews")}
        </h2>

        {loadingReviews ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full bg-[#111] rounded-2xl" />)}
          </div>
        ) : reviews && reviews.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {reviews.map(review => (
              <div key={review.id} className="bg-[#111] border border-gray-800 rounded-2xl p-5 flex gap-4">
                <Link href={`/movie/${review.tmdbId}`}>
                  <div className="w-20 aspect-[2/3] shrink-0 rounded-lg overflow-hidden bg-gray-900 border border-gray-800 hover:border-amber-500/50 transition-colors cursor-pointer shadow-lg">
                    {review.moviePosterPath ? (
                      <img src={`https://image.tmdb.org/t/p/w200${review.moviePosterPath}`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Film className="w-full h-full p-4 text-gray-700" />
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0 flex flex-col">
                  <Link href={`/movie/${review.tmdbId}`}>
                    <h3 className="font-bold text-lg leading-tight mb-1 hover:text-amber-400 transition-colors cursor-pointer truncate">{review.movieTitle || "?"}</h3>
                  </Link>
                  <div className="flex items-center gap-1 mb-2">
                    <Star size={12} className="text-amber-500 fill-amber-500" />
                    <span className="text-amber-500 font-bold text-sm">{review.rating}</span>
                    <span className="text-gray-500 text-xs">/10</span>
                  </div>
                  <div className="text-gray-300 text-sm line-clamp-3 leading-relaxed flex-1">
                    {review.isSpoiler ? (
                      <span className="text-gray-500 italic">{t("containsSpoilers")}</span>
                    ) : review.content}
                  </div>
                  <div className="text-xs text-gray-600 mt-2">{new Date(review.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-[#0a0a0a] rounded-2xl border border-dashed border-gray-800">
            <MessageSquare className="mx-auto text-gray-700 mb-3" size={40} />
            <p className="text-gray-500">{t("noReviewsDesc")}</p>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
