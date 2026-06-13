import { PageTransition } from "@/components/PageTransition";
import {
  useGetMe, useUpdateMe, useGetUserReviews, getGetUserReviewsQueryKey, getGetMeQueryKey,
  useGetWatchlists, useUpdateWatchlist, useDeleteWatchlist, getGetWatchlistsQueryKey,
  useGetWatchlistMovies, useRemoveMovieFromWatchlist, useCreateWatchlist, getGetWatchlistMoviesQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Settings, Save, Film, ListVideo, Pencil, Trash2, Check, X as XIcon, Heart, Plus, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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

function WatchlistItem({ list }: { list: { id: number; name: string; isDefault: boolean; movieCount: number } }) {
  const queryClient = useQueryClient();
  const updateWatchlist = useUpdateWatchlist();
  const deleteWatchlist = useDeleteWatchlist();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(list.name);

  const saveRename = () => {
    if (!editName.trim() || editName.trim() === list.name) { setEditing(false); return; }
    updateWatchlist.mutate({ id: list.id, data: { name: editName.trim() } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetWatchlistsQueryKey() });
        setEditing(false);
      },
    });
  };

  const handleDelete = () => {
    deleteWatchlist.mutate({ id: list.id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetWatchlistsQueryKey() }),
    });
  };

  return (
    <div className="flex items-center gap-3 bg-[#111] border border-gray-800 rounded-xl px-4 py-3 group hover:border-gray-700 transition-colors">
      <div className={`p-1.5 rounded-lg shrink-0 ${list.isDefault ? "bg-amber-500/10 text-amber-500" : "bg-gray-800 text-gray-400"}`}>
        {list.name === "Watched" ? <Film size={16} /> : <ListVideo size={16} />}
      </div>

      {editing ? (
        <Input
          value={editName}
          onChange={e => setEditName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setEditing(false); }}
          className="flex-1 h-8 bg-black border-amber-500/50 focus-visible:ring-amber-500 text-sm"
          autoFocus
        />
      ) : (
        <span className="flex-1 font-medium text-sm truncate">{list.name}</span>
      )}

      <span className="text-xs text-gray-600 shrink-0">{list.movieCount} film</span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {editing ? (
          <>
            <button onClick={saveRename} disabled={updateWatchlist.isPending}
              className="p-1.5 rounded-lg hover:bg-green-500/20 text-green-500 transition-colors">
              <Check size={15} />
            </button>
            <button onClick={() => { setEditing(false); setEditName(list.name); }}
              className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 transition-colors">
              <XIcon size={15} />
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg hover:bg-amber-500/10 text-gray-500 hover:text-amber-500 transition-colors">
              <Pencil size={14} />
            </button>
            {!list.isDefault && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#111] border-gray-800 text-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Listeyi sil</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-400">
                      <span className="text-white font-medium">"{list.name}"</span> listesi ve içindeki tüm filmler kalıcı olarak silinecek.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">İptal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white border-0">
                      Sil
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FavoritesSection({ watchlists }: { watchlists: { id: number; name: string; isDefault: boolean; movieCount: number }[] }) {
  const queryClient = useQueryClient();
  const createWatchlist = useCreateWatchlist();
  const removeMovie = useRemoveMovieFromWatchlist();

  const favList = watchlists.find(l => l.name === "Favoriler");
  const { data: favMovies, isLoading } = useGetWatchlistMovies(favList?.id ?? 0, {
    query: { enabled: !!favList, queryKey: getGetWatchlistMoviesQueryKey(favList?.id ?? 0) },
  });

  const handleCreate = () => {
    createWatchlist.mutate({ data: { name: "Favoriler" } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetWatchlistsQueryKey() }),
    });
  };

  const handleRemove = (tmdbId: number) => {
    if (!favList) return;
    removeMovie.mutate({ id: favList.id, tmdbId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetWatchlistMoviesQueryKey(favList.id) });
        queryClient.invalidateQueries({ queryKey: getGetWatchlistsQueryKey() });
      },
    });
  };

  if (!favList) {
    return (
      <div>
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Heart size={22} className="text-amber-500" />
          Favorilerim
        </h3>
        <div className="bg-[#111] border border-gray-800 border-dashed rounded-2xl p-8 text-center">
          <Heart size={32} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 mb-4 text-sm">Favori filmlerini kaydetmek için bir liste oluştur</p>
          <Button onClick={handleCreate} disabled={createWatchlist.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-5">
            <Plus size={16} className="mr-2" />
            Favoriler Listesi Oluştur
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <Heart size={22} className="text-amber-500 fill-amber-500" />
          Favorilerim
          {favMovies && <span className="text-gray-600 font-normal text-lg">({favMovies.length})</span>}
        </h3>
        <Link href="/search">
          <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-amber-500 transition-colors border border-gray-800 hover:border-amber-500/50 rounded-lg px-3 py-1.5">
            <Plus size={14} />
            Film Ekle
          </button>
        </Link>
      </div>

      {isLoading && (
        <div className="flex gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="w-28 aspect-[2/3] rounded-xl bg-[#111] shrink-0" />)}
        </div>
      )}

      {favMovies && favMovies.length === 0 && (
        <div className="bg-[#111] border border-gray-800 border-dashed rounded-2xl p-8 text-center">
          <p className="text-gray-500 text-sm">Henüz favori film eklenmemiş.</p>
          <p className="text-gray-600 text-xs mt-1">Film sayfasında "Favoriler" listesine ekleyebilirsin.</p>
        </div>
      )}

      {favMovies && favMovies.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-3 snap-x scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
          {favMovies.map(movie => (
            <div key={movie.tmdbId} className="w-28 shrink-0 snap-start group relative">
              <Link href={`/movie/${movie.tmdbId}`}>
                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-gray-900 border border-amber-500/30 group-hover:border-amber-500 group-hover:shadow-[0_4px_16px_rgba(245,158,11,0.25)] transition-all duration-300">
                  {movie.posterPath ? (
                    <img src={`https://image.tmdb.org/t/p/w200${movie.posterPath}`} alt={movie.title || ""} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Film size={24} className="text-gray-700" /></div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1.5 line-clamp-1 group-hover:text-gray-300 transition-colors px-0.5">{movie.title}</p>
              </Link>
              <button
                onClick={() => handleRemove(movie.tmdbId)}
                className="absolute top-1 right-1 bg-black/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/80 z-10"
                title="Favorilerden çıkar"
              >
                <XIcon size={11} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Profile() {
  const { t } = useLang();
  const { data: user, isLoading } = useGetMe();
  const updateMe = useUpdateMe();
  const queryClient = useQueryClient();
  const { data: watchlists } = useGetWatchlists();

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

      {!isEditing && watchlists && watchlists.length > 0 && (
        <div>
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <ListVideo size={22} className="text-amber-500" />
            Listelerim
            <span className="text-gray-600 font-normal text-lg">({watchlists.length})</span>
          </h3>
          <div className="space-y-2">
            {watchlists.map(list => (
              <WatchlistItem key={list.id} list={list} />
            ))}
          </div>
        </div>
      )}

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

      {!isEditing && watchlists && (
        <FavoritesSection watchlists={watchlists} />
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
