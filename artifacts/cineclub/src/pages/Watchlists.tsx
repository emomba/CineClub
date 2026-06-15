import { useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { MovieCard } from "@/components/MovieCard";
import {
  useGetWatchlists,
  useGetWatchlistMovies,
  useCreateWatchlist,
  useAddMovieToWatchlist,
  useRemoveMovieFromWatchlist,
  useUpsertReview,
  getGetWatchlistMoviesQueryKey,
  type WatchlistMovie,
} from "@workspace/api-client-react";
import { ListVideo, Plus, LayoutGrid, Film, CheckCircle2, Star, X, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";

const TMDB_IMG = "https://image.tmdb.org/t/p/w92";

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex gap-0.5"
        onMouseLeave={() => setHovered(0)}
      >
        {Array.from({ length: 10 }, (_, i) => {
          const full = i + 1;
          const half = i + 0.5;
          const isFull = display >= full;
          const isHalf = !isFull && display >= half;
          return (
            <div key={i} className="relative" style={{ width: 22, height: 22 }}>
              {/* left half → 0.5 increment */}
              <div
                className="absolute left-0 top-0 h-full z-10 cursor-pointer"
                style={{ width: "50%" }}
                onMouseEnter={() => setHovered(half)}
                onClick={() => onChange(half)}
              />
              {/* right half → full increment */}
              <div
                className="absolute right-0 top-0 h-full z-10 cursor-pointer"
                style={{ width: "50%" }}
                onMouseEnter={() => setHovered(full)}
                onClick={() => onChange(full)}
              />
              {/* empty base */}
              <Star size={22} className="text-gray-700 absolute inset-0" />
              {/* full fill */}
              {isFull && <Star size={22} className="fill-amber-400 text-amber-400 absolute inset-0 pointer-events-none" />}
              {/* half fill */}
              {isHalf && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ width: "50%" }}>
                  <Star size={22} className="fill-amber-400 text-amber-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {display > 0 && (
        <span className="text-amber-400 font-bold text-sm">
          {display % 1 === 0 ? `${display}.0` : display} / 10
        </span>
      )}
    </div>
  );
}

function MarkWatchedModal({
  movie,
  watchlistId,
  watchedListId,
  open,
  onClose,
}: {
  movie: WatchlistMovie;
  watchlistId: number;
  watchedListId: number;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const addToWatched = useAddMovieToWatchlist();
  const removeFromWatchLater = useRemoveMovieFromWatchlist();
  const upsertReview = useUpsertReview();

  const handleConfirm = async () => {
    if (!rating) { toast.error(t("ratingRequired") || "Puan seçmelisin"); return; }
    setSubmitting(true);
    try {
      await Promise.all([
        addToWatched.mutateAsync({ id: watchedListId, data: { tmdbId: movie.tmdbId, title: movie.title, posterPath: movie.posterPath, releaseYear: movie.releaseYear, voteAverage: movie.voteAverage } }),
        upsertReview.mutateAsync({ data: { tmdbId: movie.tmdbId, movieTitle: movie.title, moviePosterPath: movie.posterPath, rating, content: comment, isSpoiler: false } }),
      ]);
      await removeFromWatchLater.mutateAsync({ id: watchlistId, tmdbId: movie.tmdbId });
      queryClient.invalidateQueries({ queryKey: getGetWatchlistMoviesQueryKey(watchlistId) });
      queryClient.invalidateQueries({ queryKey: getGetWatchlistMoviesQueryKey(watchedListId) });
      toast.success(t("markedWatched") || "İzledim listesine eklendi!");
      onClose();
    } catch {
      toast.error(t("errorOccurred"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#111] border-gray-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <CheckCircle2 size={20} className="text-green-400" />
            {t("markWatched") || "Film İzledim"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 py-2">
          {movie.posterPath ? (
            <img src={`${TMDB_IMG}${movie.posterPath}`} alt={movie.title} className="w-12 h-[72px] rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-12 h-[72px] rounded-lg bg-[#222] flex items-center justify-center shrink-0">
              <Film size={20} className="text-gray-600" />
            </div>
          )}
          <div>
            <p className="font-bold text-white leading-snug">{movie.title}</p>
            {movie.releaseYear && <p className="text-sm text-gray-500">{movie.releaseYear}</p>}
          </div>
        </div>

        <div className="space-y-4 pt-1">
          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 block">
              {t("yourRating") || "Puanın"} <span className="text-red-400">*</span>
            </label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 block">
              {t("comment") || "Yorum"} <span className="text-gray-600 font-normal">({t("optional") || "isteğe bağlı"})</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("commentPlaceholder") || "Filmle ilgili düşüncelerini yaz..."}
              rows={3}
              className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-700 text-gray-400 hover:text-white hover:bg-white/5"
            >
              {t("cancel") || "İptal"}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!rating || submitting}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold hover:from-green-500 hover:to-emerald-400 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : (t("confirmWatched") || "İzledim!")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WatchLaterRow({ movie, watchlistId, watchedListId }: { movie: WatchlistMovie; watchlistId: number; watchedListId: number }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-4 bg-[#0d0d0d] hover:bg-[#111] border border-gray-800/60 hover:border-gray-700/60 rounded-xl px-4 py-3 transition-all group">
        {movie.posterPath ? (
          <img src={`${TMDB_IMG}${movie.posterPath}`} alt={movie.title} className="w-10 h-[60px] rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-10 h-[60px] rounded-lg bg-[#222] flex items-center justify-center shrink-0">
            <Film size={16} className="text-gray-600" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm leading-snug truncate">{movie.title}</p>
          {movie.releaseYear && <p className="text-xs text-gray-500 mt-0.5">{movie.releaseYear}</p>}
          {movie.voteAverage ? (
            <div className="flex items-center gap-1 mt-1">
              <Star size={11} className="fill-amber-400 text-amber-400" />
              <span className="text-xs text-gray-400">{movie.voteAverage.toFixed(1)}</span>
            </div>
          ) : null}
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 hover:border-green-500/60 text-green-400 hover:text-green-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shrink-0"
        >
          <CheckCircle2 size={13} />
          <span>İzledim</span>
        </button>
      </div>

      <MarkWatchedModal
        movie={movie}
        watchlistId={watchlistId}
        watchedListId={watchedListId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

function WatchlistSection({
  watchlistId,
  name,
  isDefault,
  watchedListId,
}: {
  watchlistId: number;
  name: string;
  isDefault: boolean;
  watchedListId?: number;
}) {
  const { t } = useLang();
  const { data: movies, isLoading } = useGetWatchlistMovies(watchlistId, {
    query: { enabled: !!watchlistId, queryKey: getGetWatchlistMoviesQueryKey(watchlistId) }
  });

  const isWatchLater = name === "İzleyeceğim";

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isDefault ? "bg-amber-500/10 text-amber-500" : "bg-gray-800/50 text-gray-300"}`}>
            {name === "İzledim" ? <Film size={20} /> : <ListVideo size={20} />}
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{name}</h2>
          <span className="bg-[#111] text-gray-400 text-xs px-2 py-1 rounded-full border border-gray-800 font-medium">
            {movies?.length || 0}
          </span>
        </div>
      </div>

      {isLoading ? (
        isWatchLater ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[76px] w-full rounded-xl bg-[#111]" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="w-full aspect-[2/3] rounded-xl bg-[#111]" />)}
          </div>
        )
      ) : movies && movies.length > 0 ? (
        isWatchLater && watchedListId ? (
          <div className="space-y-2">
            {movies.map((movie) => (
              <WatchLaterRow key={movie.id} movie={movie} watchlistId={watchlistId} watchedListId={watchedListId} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {movies.map((movie) => (
              <div key={movie.id} className="w-full">
                <MovieCard movie={{ ...movie, backdropPath: null, popularity: 0, genreIds: [], overview: "", releaseYear: movie.releaseYear ?? null, voteAverage: movie.voteAverage ?? 0 }} showRating={false} />
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="bg-[#0a0a0a] border border-gray-800 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center">
          <LayoutGrid size={40} className="text-gray-700 mb-4" />
          <h3 className="text-lg font-bold text-gray-400 mb-2">{t("listEmpty")}</h3>
          <p className="text-gray-600 max-w-sm">{t("searchMoviesToAdd")}</p>
        </div>
      )}
    </div>
  );
}

export default function Watchlists() {
  const { t } = useLang();
  const { data: watchlists, isLoading } = useGetWatchlists();
  const createWatchlist = useCreateWatchlist();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [newListName, setNewListName] = useState("");

  const watchedListId = watchlists?.find(l => l.name === "İzledim")?.id;

  const handleCreateList = () => {
    if (!newListName.trim()) return;
    createWatchlist.mutate({ data: { name: newListName.trim() } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["getWatchlists"] });
        setIsOpen(false);
        setNewListName("");
        toast.success(t("watchlistCreated"));
      }
    });
  };

  return (
    <PageTransition>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">{t("yourLists")}</h1>
          <p className="text-gray-400">{t("manageLists")}</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-red-500 text-black font-bold px-6 py-3 rounded-xl hover:from-amber-400 hover:to-red-400 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Plus size={20} />
              <span>{t("createNewList")}</span>
            </button>
          </DialogTrigger>
          <DialogContent className="bg-[#111] border-gray-800 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{t("createNewListTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">{t("listNameLabel")}</label>
                <Input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
                  placeholder={t("listName")}
                  className="bg-black border-gray-800 focus-visible:ring-amber-500"
                />
              </div>
              <Button
                onClick={handleCreateList}
                disabled={!newListName.trim() || createWatchlist.isPending}
                className="w-full bg-gradient-to-r from-amber-500 to-red-500 text-black font-bold hover:from-amber-400 hover:to-red-400"
              >
                {createWatchlist.isPending ? t("creating") : t("createListBtn")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          <Skeleton className="h-10 w-48 bg-[#111]" />
          <div className="flex gap-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="w-[200px] aspect-[2/3] rounded-xl bg-[#111]" />)}
          </div>
        </div>
      ) : watchlists ? (
        <div className="space-y-4">
          {watchlists.map(list => (
            <WatchlistSection
              key={list.id}
              watchlistId={list.id}
              name={list.name}
              isDefault={list.isDefault}
              watchedListId={watchedListId}
            />
          ))}
        </div>
      ) : null}
    </PageTransition>
  );
}
