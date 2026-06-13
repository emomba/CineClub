import { useParams, useLocation } from "wouter";
import { PageTransition } from "@/components/PageTransition";
import {
  useGetMovie,
  useGetMovieReviews,
  useGetMovieUserStatus,
  useGetWatchlists,
  useAddMovieToWatchlist,
  useRemoveMovieFromWatchlist,
  useUpsertReview,
  useGetFriends
} from "@workspace/api-client-react";
import { getBackdropUrl, getPosterUrl, getProfileUrl } from "@/lib/tmdb";
import { Star, Clock, Calendar, Plus, Check, EyeOff, MessageSquare, Send, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { getGetMovieUserStatusQueryKey, getGetMovieReviewsQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";
import { MovieCard } from "@/components/MovieCard";

function StarRating({ rating, setRating, readOnly = false }: { rating: number; setRating?: (r: number) => void; readOnly?: boolean }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
        <button key={star} type="button" disabled={readOnly} onClick={() => setRating && setRating(star)}
          className={`${readOnly ? "cursor-default" : "cursor-pointer transition-transform hover:scale-110"}`}>
          <Star size={readOnly ? 16 : 24}
            className={star <= rating ? "text-amber-500 fill-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "text-gray-700"} />
        </button>
      ))}
    </div>
  );
}

function HalfStarRating({ rating, setRating }: { rating: number; setRating: (r: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || rating;
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5,6,7,8,9,10].map(star => {
        const full = star <= Math.floor(display) && !(display === star - 0.5);
        const half = display === star - 0.5;
        return (
          <div key={star} className="relative w-7 h-7">
            <Star size={28} className={full ? "text-amber-500 fill-amber-500" : "text-gray-700"} />
            {half && (
              <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
                <Star size={28} className="text-amber-500 fill-amber-500" />
              </div>
            )}
            <div className="absolute inset-0 flex">
              <div className="w-1/2 h-full cursor-pointer"
                onMouseEnter={() => setHovered(star - 0.5)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(star - 0.5)} />
              <div className="w-1/2 h-full cursor-pointer"
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(star)} />
            </div>
          </div>
        );
      })}
      <span className="ml-2 text-amber-500 font-bold text-lg self-center min-w-[2.5rem]">
        {display > 0 ? display : "—"}
      </span>
    </div>
  );
}

function ReviewCard({ review }: { review: any }) {
  const { t } = useLang();
  const [showSpoiler, setShowSpoiler] = useState(false);

  return (
    <div className="bg-[#111] border border-gray-800 rounded-xl p-5 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden">
            {review.user?.avatarUrl ? (
              <img src={review.user.avatarUrl} alt={review.user.username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400 font-bold">
                {review.user?.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="font-medium text-white">{review.user?.displayName || review.user?.username}</div>
            <div className="text-xs text-gray-500">@{review.user?.username}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-lg">
          <Star size={14} className="text-amber-500 fill-amber-500" />
          <span className="font-bold text-amber-500">{review.rating}</span>
          <span className="text-gray-500 text-xs">/10</span>
        </div>
      </div>

      <div className="relative">
        {review.isSpoiler && !showSpoiler ? (
          <div className="absolute inset-0 backdrop-blur-xl bg-black/40 z-10 flex items-center justify-center cursor-pointer rounded-lg border border-red-500/20"
            onClick={() => setShowSpoiler(true)}>
            <div className="flex items-center gap-2 text-red-400 font-medium">
              <EyeOff size={18} />
              <span>{t("spoilerWarning")}</span>
            </div>
          </div>
        ) : null}
        <p className={`text-gray-300 leading-relaxed whitespace-pre-wrap ${review.isSpoiler && !showSpoiler ? 'opacity-0 h-24 overflow-hidden' : ''}`}>
          {review.content}
        </p>
      </div>

      <div className="mt-4 text-xs text-gray-600">{new Date(review.createdAt).toLocaleDateString()}</div>
    </div>
  );
}


export default function MovieDetail() {
  const { t } = useLang();
  const params = useParams<{ tmdbId: string }>();
  const tmdbId = Number(params.tmdbId);
  const queryClient = useQueryClient();

  const { data: movie, isLoading } = useGetMovie(tmdbId, {
    query: { enabled: !!tmdbId, queryKey: [`/api/movies/${tmdbId}`] }
  });

  const { data: reviews } = useGetMovieReviews(tmdbId, {
    query: { enabled: !!tmdbId, queryKey: getGetMovieReviewsQueryKey(tmdbId) }
  });

  const { data: status } = useGetMovieUserStatus(tmdbId, {
    query: { enabled: !!tmdbId, queryKey: getGetMovieUserStatusQueryKey(tmdbId) }
  });

  const { data: relatedMovies } = useQuery<{ results: any[] }>({
    queryKey: ["movieRecs", tmdbId],
    queryFn: () => fetch(`/api/movies/${tmdbId}/recommendations`).then(r => r.json()),
    enabled: !!tmdbId,
    staleTime: 10 * 60 * 1000,
  });

  const { data: watchlists } = useGetWatchlists();
  const addToList = useAddMovieToWatchlist();
  const removeFromList = useRemoveMovieFromWatchlist();
  const upsertReview = useUpsertReview();

  const { data: friends } = useGetFriends();

  const [, setLocation] = useLocation();
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(0);
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isRecommendOpen, setIsRecommendOpen] = useState(false);
  const [recFriendId, setRecFriendId] = useState("");
  const [recRating, setRecRating] = useState(0);
  const [recNote, setRecNote] = useState("");
  const [recSending, setRecSending] = useState(false);

  const handleToggleWatchlist = (watchlistId: number, isInList: boolean) => {
    if (!movie) return;
    if (isInList) {
      removeFromList.mutate({ id: watchlistId, tmdbId: movie.tmdbId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMovieUserStatusQueryKey(tmdbId) });
          toast.success(t("removedFromWatchlist"));
        }
      });
    } else {
      addToList.mutate({
        id: watchlistId,
        data: { tmdbId: movie.tmdbId, title: movie.title, posterPath: movie.posterPath, releaseYear: movie.releaseYear, voteAverage: movie.voteAverage }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMovieUserStatusQueryKey(tmdbId) });
          toast.success(t("addedToWatchlist"));
        }
      });
    }
  };

  const submitRecommend = async () => {
    if (!recFriendId) { toast.error(t("selectFriend")); return; }
    if (!movie) return;
    setRecSending(true);
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: recFriendId,
          tmdbId: movie.tmdbId,
          movieTitle: movie.title,
          moviePosterPath: movie.posterPath,
          rating: recRating > 0 ? recRating : null,
          message: recNote.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("recommendSent"));
      setIsRecommendOpen(false);
      setRecFriendId("");
      setRecRating(0);
      setRecNote("");
    } catch {
      toast.error("Hata oluştu, tekrar dene.");
    } finally {
      setRecSending(false);
    }
  };

  const submitReview = () => {
    if (rating === 0) { toast.error(t("ratingRequired")); return; }
    upsertReview.mutate({
      data: { tmdbId: movie!.tmdbId, movieTitle: movie!.title, moviePosterPath: movie!.posterPath, rating, content: reviewText, isSpoiler }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMovieReviewsQueryKey(tmdbId) });
        queryClient.invalidateQueries({ queryKey: getGetMovieUserStatusQueryKey(tmdbId) });
        setIsReviewOpen(false);
        toast.success(t("reviewPosted"));
      }
    });
  };

  if (isLoading || !movie) {
    return (
      <div className="min-h-screen">
        <Skeleton className="w-full h-[50vh] bg-[#111]" />
        <div className="max-w-6xl mx-auto px-4 -mt-32 flex gap-8">
          <Skeleton className="w-[300px] h-[450px] rounded-xl bg-[#222] z-10" />
          <div className="flex-1 pt-40 space-y-4">
            <Skeleton className="h-10 w-2/3 bg-[#111]" />
            <Skeleton className="h-6 w-1/3 bg-[#111]" />
            <Skeleton className="h-32 w-full bg-[#111]" />
          </div>
        </div>
      </div>
    );
  }

  const backdropUrl = getBackdropUrl(movie.backdropPath);

  return (
    <PageTransition className="relative pb-20">
      {/* Backdrop — absolute is relative to this PageTransition (which is now `relative`) */}
      <div className="absolute top-0 left-0 right-0 h-[55vh] z-0 overflow-hidden pointer-events-none">
        {backdropUrl && (
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25"
            style={{ backgroundImage: `url(${backdropUrl})` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent" />
      </div>

      <div className="relative z-10 pt-[20vh] md:pt-[28vh] flex flex-col md:flex-row gap-8 items-start">
        {/* Poster */}
        <div className="w-[200px] md:w-[300px] shrink-0 rounded-2xl overflow-hidden border-2 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <img src={getPosterUrl(movie.posterPath)} alt={movie.title} className="w-full h-auto object-cover" />
        </div>

        {/* Details */}
        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-2 drop-shadow-lg">{movie.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-gray-300 font-medium">
              {movie.releaseYear && (
                <div className="flex items-center gap-1">
                  <Calendar size={16} className="text-amber-500" /><span>{movie.releaseYear}</span>
                </div>
              )}
              {movie.runtime && (
                <div className="flex items-center gap-1">
                  <Clock size={16} className="text-amber-500" />
                  <span>{Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>
                </div>
              )}
              {(movie as any).imdbRating != null ? (
                <div className="flex items-center gap-1 bg-[#f3ce13]/10 border border-[#f3ce13]/30 px-2 py-0.5 rounded-lg">
                  <span className="font-black text-[#f3ce13] text-sm tracking-tight">IMDb</span>
                  <span className="text-white font-bold ml-1">{(movie as any).imdbRating.toFixed(1)}</span>
                  <span className="text-gray-500 text-xs">/10</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Star size={16} className="text-amber-500 fill-amber-500" />
                  <span className="text-white font-bold">{movie.voteAverage?.toFixed(1)}</span>
                  <span className="text-gray-500 text-sm">TMDB</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {movie.genres.map((g: any) => (
              <button
                key={g.id}
                onClick={() => setLocation(`/search?genre=${g.id}&genreName=${encodeURIComponent(g.name)}`)}
                className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-sm font-medium border border-white/5 hover:bg-gradient-to-r hover:from-amber-500 hover:to-red-500 hover:text-black hover:border-transparent transition-all cursor-pointer"
              >
                {g.name}
              </button>
            ))}
          </div>

          {/* Action buttons — no Watch Trailer link */}
          <div className="flex flex-wrap gap-4 pt-2">
            <Dialog>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 bg-[#111] border border-gray-800 text-white font-medium px-6 py-3 rounded-xl transition-all hover:bg-gradient-to-r hover:from-amber-500 hover:to-red-500 hover:text-black hover:border-transparent">
                  {status?.watchlistIds && status.watchlistIds.length > 0 ? (
                    <><Check size={20} className="text-green-500 group-hover:text-black" /><span>{t("inWatchlist")}</span></>
                  ) : (
                    <><Plus size={20} /><span>{t("addToList")}</span></>
                  )}
                </button>
              </DialogTrigger>
              <DialogContent className="bg-[#111] border-gray-800 text-white sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">{t("addToWatchlist")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-4">
                  {watchlists?.map(list => {
                    const isInList = status?.watchlistIds?.includes(list.id) || false;
                    return (
                      <div key={list.id}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer border border-transparent hover:border-gray-800 transition-colors"
                        onClick={() => handleToggleWatchlist(list.id, isInList)}>
                        <div className="font-medium">{list.name}</div>
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${isInList ? 'bg-amber-500 border-amber-500 text-black' : 'border-gray-600'}`}>
                          {isInList && <Check size={14} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 bg-[#111] border border-gray-800 text-white font-medium px-6 py-3 rounded-xl transition-all hover:bg-gradient-to-r hover:from-amber-500 hover:to-red-500 hover:text-black hover:border-transparent">
                  <MessageSquare size={20} />
                  <span>{status?.hasReview ? t("editReview") : t("writeReview")}</span>
                </button>
              </DialogTrigger>
              <DialogContent className="bg-[#111] border-gray-800 text-white sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">
                    {status?.hasReview ? t("editReview") : t("writeReview")} — {movie.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-gray-400 font-medium">{t("yourRating")}</span>
                    <StarRating rating={rating} setRating={setRating} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="review">{t("yourThoughts")}</Label>
                    <Textarea id="review" value={reviewText} onChange={e => setReviewText(e.target.value)}
                      placeholder={t("movieThoughts")}
                      className="min-h-[120px] bg-black border-gray-800 resize-none focus-visible:ring-amber-500" />
                  </div>
                  <div className="flex items-center justify-between bg-black/50 p-3 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-3 text-red-400">
                      <EyeOff size={20} />
                      <div className="space-y-0.5">
                        <Label className="text-white cursor-pointer" htmlFor="spoiler">{t("containsSpoilers")}</Label>
                        <p className="text-xs text-gray-500">{t("blurReview")}</p>
                      </div>
                    </div>
                    <Switch id="spoiler" checked={isSpoiler} onCheckedChange={setIsSpoiler} />
                  </div>
                  <Button onClick={submitReview}
                    className="w-full bg-gradient-to-r from-amber-500 to-red-500 text-black font-bold hover:from-amber-400 hover:to-red-400 py-6 text-lg rounded-xl">
                    {t("postReview")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Filmi Öner */}
            <Dialog open={isRecommendOpen} onOpenChange={setIsRecommendOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-xl transition-colors shadow-[0_0_16px_rgba(16,185,129,0.25)] hover:shadow-[0_0_24px_rgba(16,185,129,0.4)]">
                  <Send size={18} />
                  <span>{t("recommendMovie")}</span>
                </button>
              </DialogTrigger>
              <DialogContent className="bg-[#111] border-gray-800 text-white sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">{t("recommendMovie")} — {movie.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-5 pt-4">
                  {/* Friend select */}
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-sm">{t("recommendTo")}</Label>
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                      {friends && friends.length > 0 ? friends.map((f: any) => (
                        <div key={f.clerkId}
                          onClick={() => setRecFriendId(f.clerkId)}
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${recFriendId === f.clerkId ? "bg-emerald-600/20 border-emerald-500/50" : "border-transparent hover:bg-white/5"}`}>
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 shrink-0">
                            {f.avatarUrl ? (
                              <img src={f.avatarUrl} alt={f.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User size={14} className="text-gray-500" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-sm text-white">{f.displayName || f.username}</div>
                            <div className="text-xs text-gray-500">@{f.username}</div>
                          </div>
                          {recFriendId === f.clerkId && (
                            <Check size={16} className="text-emerald-400 ml-auto" />
                          )}
                        </div>
                      )) : (
                        <p className="text-gray-500 text-sm py-2">{t("noFriends")}</p>
                      )}
                    </div>
                  </div>

                  {/* Half-star rating */}
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-sm">{t("recommendRating")}</Label>
                    <HalfStarRating rating={recRating} setRating={setRecRating} />
                  </div>

                  {/* Note */}
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-sm">{t("recommendNote")}</Label>
                    <Textarea
                      value={recNote}
                      onChange={e => setRecNote(e.target.value)}
                      placeholder={t("message")}
                      className="min-h-[80px] bg-black border-gray-800 resize-none focus-visible:ring-emerald-500 text-sm"
                    />
                  </div>

                  <Button
                    onClick={submitRecommend}
                    disabled={recSending || !recFriendId}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} className="mr-2" />
                    {recSending ? "Gönderiliyor..." : t("send")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Overview */}
          <div className="pt-6">
            <h3 className="text-xl font-bold mb-3">{t("overview")}</h3>
            <p className="text-gray-300 leading-relaxed text-lg">{movie.overview}</p>
          </div>

          {/* Embedded YouTube Trailer — compact size */}
          {movie.trailerKey && (
            <div className="pt-4">
              <div className="max-w-xl aspect-video rounded-2xl overflow-hidden border border-gray-800 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                <iframe
                  src={`https://www.youtube.com/embed/${movie.trailerKey}?rel=0&modestbranding=1`}
                  title={`${movie.title} Trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>
          )}

          {/* Cast — grid, alta doğru devam eder, sağa taşmaz */}
          {movie.cast && movie.cast.length > 0 && (
            <div className="pt-6">
              <h3 className="text-xl font-bold mb-4">{t("cast")}</h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-3">
                {movie.cast.slice(0, 12).map((person: any) => (
                  <button
                    key={person.id}
                    onClick={() => setLocation(`/actor/${person.id}`)}
                    className="text-left group focus:outline-none"
                  >
                    <div className="aspect-[2/3] rounded-xl overflow-hidden bg-[#111] mb-2 border border-gray-800 group-hover:border-amber-500/50 transition-colors group-hover:scale-105 transform duration-200">
                      <img
                        src={getProfileUrl(person.profilePath)}
                        alt={person.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="font-medium text-sm line-clamp-1 group-hover:text-amber-500 transition-colors">{person.name}</div>
                    <div className="text-xs text-gray-500 line-clamp-2">{person.character}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-20 border-t border-gray-800 pt-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold tracking-tight">{t("clubReviews")}</h2>
          <div className="bg-[#111] px-4 py-2 rounded-lg border border-gray-800 flex items-center gap-2">
            <span className="text-gray-400 font-medium">{t("average")}:</span>
            <Star size={16} className="text-amber-500 fill-amber-500" />
            <span className="font-bold text-lg text-white">
              {reviews && reviews.length > 0
                ? (reviews.reduce((a: number, b: any) => a + b.rating, 0) / reviews.length).toFixed(1)
                : "-"}
            </span>
          </div>
        </div>

        {reviews && reviews.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {reviews.map((review: any) => <ReviewCard key={review.id} review={review} />)}
          </div>
        ) : (
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-12 text-center">
            <MessageSquare size={48} className="mx-auto text-gray-700 mb-4" />
            <h3 className="text-xl font-bold text-gray-300 mb-2">{t("noReviewsClub")}</h3>
            <p className="text-gray-500 max-w-md mx-auto">{t("noReviewsClubDesc")}</p>
          </div>
        )}
      </div>

      {/* More Like This */}
      {relatedMovies && relatedMovies.results && relatedMovies.results.length > 0 && (
        <div className="mt-16 border-t border-gray-800 pt-12">
          <h2 className="text-3xl font-bold tracking-tight mb-6">{t("moreLikeThis")}</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
            {relatedMovies.results.slice(0, 20).map((m: any) => (
              <div key={m.tmdbId} className="snap-start shrink-0">
                <MovieCard movie={m} />
              </div>
            ))}
          </div>
        </div>
      )}

    </PageTransition>
  );
}
