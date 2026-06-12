import { useParams } from "wouter";
import { PageTransition } from "@/components/PageTransition";
import { 
  useGetMovie, 
  useGetMovieReviews, 
  useGetFriendsWhoWatchedMovie,
  useGetMovieUserStatus,
  useGetWatchlists,
  useAddMovieToWatchlist,
  useRemoveMovieFromWatchlist,
  useUpsertReview
} from "@workspace/api-client-react";
import { getBackdropUrl, getPosterUrl, getProfileUrl } from "@/lib/tmdb";
import { Star, Clock, Calendar, Play, Plus, Check, Eye, EyeOff, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMovieUserStatusQueryKey, getGetMovieReviewsQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";

function StarRating({ rating, setRating, readOnly = false }: { rating: number, setRating?: (r: number) => void, readOnly?: boolean }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => setRating && setRating(star)}
          className={`${readOnly ? "cursor-default" : "cursor-pointer transition-transform hover:scale-110"}`}
        >
          <Star 
            size={readOnly ? 16 : 24} 
            className={`${
              star <= rating 
                ? "text-amber-500 fill-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
                : "text-gray-700"
            }`} 
          />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: any }) {
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
          <div 
            className="absolute inset-0 backdrop-blur-xl bg-black/40 z-10 flex items-center justify-center cursor-pointer rounded-lg border border-red-500/20"
            onClick={() => setShowSpoiler(true)}
          >
            <div className="flex items-center gap-2 text-red-400 font-medium">
              <EyeOff size={18} />
              <span>Contains Spoilers. Click to reveal.</span>
            </div>
          </div>
        ) : null}
        
        <p className={`text-gray-300 leading-relaxed whitespace-pre-wrap ${review.isSpoiler && !showSpoiler ? 'opacity-0 h-24 overflow-hidden' : ''}`}>
          {review.content}
        </p>
      </div>
      
      <div className="mt-4 text-xs text-gray-600">
        {new Date(review.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}

export default function MovieDetail() {
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

  const { data: watchlists } = useGetWatchlists();
  
  const addToList = useAddMovieToWatchlist();
  const removeFromList = useRemoveMovieFromWatchlist();
  const upsertReview = useUpsertReview();

  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(0);
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  useEffect(() => {
    if (status?.hasReview && reviews) {
      // Find my review and prepopulate if it exists
      // Wait, we don't have myUserId here directly easily without useMe, 
      // but let's just clear for now or we could load it.
    }
  }, [status, reviews]);

  const handleToggleWatchlist = (watchlistId: number, isInList: boolean) => {
    if (!movie) return;
    
    if (isInList) {
      removeFromList.mutate({ 
        id: watchlistId,
        tmdbId: movie.tmdbId
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMovieUserStatusQueryKey(tmdbId) });
          toast.success("Removed from watchlist");
        }
      });
    } else {
      addToList.mutate({ 
        id: watchlistId,
        data: { 
          tmdbId: movie.tmdbId,
          title: movie.title,
          posterPath: movie.posterPath,
          releaseYear: movie.releaseYear,
          voteAverage: movie.voteAverage
        } 
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMovieUserStatusQueryKey(tmdbId) });
          toast.success("Added to watchlist");
        }
      });
    }
  };

  const submitReview = () => {
    if (rating === 0) {
      toast.error("Please provide a rating");
      return;
    }
    
    upsertReview.mutate({
      data: {
        tmdbId: movie!.tmdbId,
        movieTitle: movie!.title,
        moviePosterPath: movie!.posterPath,
        rating,
        content: reviewText,
        isSpoiler
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMovieReviewsQueryKey(tmdbId) });
        queryClient.invalidateQueries({ queryKey: getGetMovieUserStatusQueryKey(tmdbId) });
        setIsReviewOpen(false);
        toast.success("Review posted successfully!");
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
  const dominantColor = movie.dominantColor || "#f59e0b"; // Fallback to amber

  return (
    <PageTransition className="pb-20">
      {/* Backdrop */}
      <div className="absolute top-0 left-0 right-0 h-[60vh] z-0 overflow-hidden pointer-events-none">
        {backdropUrl && (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
            style={{ backgroundImage: `url(${backdropUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />
        <div 
          className="absolute inset-0 mix-blend-color opacity-30" 
          style={{ backgroundColor: dominantColor }}
        />
      </div>

      <div className="relative z-10 pt-[20vh] md:pt-[30vh] flex flex-col md:flex-row gap-8 items-start">
        {/* Poster */}
        <div className="w-[200px] md:w-[300px] shrink-0 rounded-2xl overflow-hidden border-2 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] shadow-black group">
          <img 
            src={getPosterUrl(movie.posterPath)} 
            alt={movie.title} 
            className="w-full h-auto object-cover"
          />
        </div>

        {/* Details */}
        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-2 drop-shadow-lg">
              {movie.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-gray-300 font-medium">
              {movie.releaseYear && (
                <div className="flex items-center gap-1">
                  <Calendar size={16} className="text-amber-500" />
                  <span>{movie.releaseYear}</span>
                </div>
              )}
              {movie.runtime && (
                <div className="flex items-center gap-1">
                  <Clock size={16} className="text-amber-500" />
                  <span>{Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Star size={16} className="text-amber-500 fill-amber-500" />
                <span className="text-white font-bold">{movie.voteAverage?.toFixed(1)}</span>
                <span className="text-gray-500 text-sm">TMDB</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {movie.genres.map(g => (
              <span key={g.id} className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-sm font-medium border border-white/5">
                {g.name}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            {movie.trailerKey && (
              <a 
                href={`https://www.youtube.com/watch?v=${movie.trailerKey}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-red-500 text-black font-bold px-6 py-3 rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              >
                <Play size={20} className="fill-black" />
                <span>Watch Trailer</span>
              </a>
            )}

            <Dialog>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 bg-[#111] hover:bg-[#222] border border-gray-800 text-white font-medium px-6 py-3 rounded-xl transition-colors">
                  {status?.watchlistIds && status.watchlistIds.length > 0 ? (
                    <><Check size={20} className="text-green-500" /> <span>In Watchlist</span></>
                  ) : (
                    <><Plus size={20} /> <span>Add to List</span></>
                  )}
                </button>
              </DialogTrigger>
              <DialogContent className="bg-[#111] border-gray-800 text-white sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Add to Watchlist</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-4">
                  {watchlists?.map(list => {
                    const isInList = status?.watchlistIds?.includes(list.id) || false;
                    return (
                      <div 
                        key={list.id} 
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer border border-transparent hover:border-gray-800 transition-colors"
                        onClick={() => handleToggleWatchlist(list.id, isInList)}
                      >
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
                <button className="flex items-center gap-2 bg-[#111] hover:bg-[#222] border border-gray-800 text-white font-medium px-6 py-3 rounded-xl transition-colors">
                  <MessageSquare size={20} /> 
                  <span>{status?.hasReview ? 'Edit Review' : 'Add Review'}</span>
                </button>
              </DialogTrigger>
              <DialogContent className="bg-[#111] border-gray-800 text-white sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">{status?.hasReview ? 'Edit' : 'Write'} Review for {movie.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-gray-400 font-medium">Your Rating</span>
                    <StarRating rating={rating} setRating={setRating} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="review">Your thoughts</Label>
                    <Textarea 
                      id="review"
                      value={reviewText}
                      onChange={e => setReviewText(e.target.value)}
                      placeholder="What did you think of the movie?"
                      className="min-h-[120px] bg-black border-gray-800 resize-none focus-visible:ring-amber-500"
                    />
                  </div>

                  <div className="flex items-center justify-between bg-black/50 p-3 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-3 text-red-400">
                      <EyeOff size={20} />
                      <div className="space-y-0.5">
                        <Label className="text-white cursor-pointer" htmlFor="spoiler">Contains Spoilers</Label>
                        <p className="text-xs text-gray-500">Blur this review for others</p>
                      </div>
                    </div>
                    <Switch id="spoiler" checked={isSpoiler} onCheckedChange={setIsSpoiler} />
                  </div>

                  <Button 
                    onClick={submitReview}
                    className="w-full bg-gradient-to-r from-amber-500 to-red-500 text-black font-bold hover:from-amber-400 hover:to-red-400 py-6 text-lg rounded-xl"
                  >
                    Post Review
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="pt-6">
            <h3 className="text-xl font-bold mb-3">Overview</h3>
            <p className="text-gray-300 leading-relaxed text-lg">{movie.overview}</p>
          </div>

          {movie.cast && movie.cast.length > 0 && (
            <div className="pt-6">
              <h3 className="text-xl font-bold mb-4">Cast</h3>
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
                {movie.cast.slice(0, 10).map(person => (
                  <div key={person.id} className="w-[120px] shrink-0 snap-start">
                    <div className="aspect-[2/3] rounded-xl overflow-hidden bg-[#111] mb-2 border border-gray-800">
                      <img 
                        src={getProfileUrl(person.profilePath)} 
                        alt={person.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="font-medium text-sm line-clamp-1">{person.name}</div>
                    <div className="text-xs text-gray-500 line-clamp-1">{person.character}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-20 border-t border-gray-800 pt-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Club Reviews</h2>
          <div className="bg-[#111] px-4 py-2 rounded-lg border border-gray-800 flex items-center gap-2">
            <span className="text-gray-400 font-medium">Average:</span>
            <Star size={16} className="text-amber-500 fill-amber-500" />
            <span className="font-bold text-lg text-white">
              {reviews && reviews.length > 0 
                ? (reviews.reduce((a, b) => a + b.rating, 0) / reviews.length).toFixed(1) 
                : "-"}
            </span>
          </div>
        </div>

        {reviews && reviews.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {reviews.map(review => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-12 text-center">
            <MessageSquare size={48} className="mx-auto text-gray-700 mb-4" />
            <h3 className="text-xl font-bold text-gray-300 mb-2">No reviews yet</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              None of your friends have reviewed this movie yet. Be the first to share your thoughts!
            </p>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
