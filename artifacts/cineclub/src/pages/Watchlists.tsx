import { useState } from "react";
import { PageTransition } from "@/components/PageTransition";
import { MovieCard } from "@/components/MovieCard";
import { 
  useGetWatchlists, 
  useGetWatchlistMovies, 
  useCreateWatchlist,
  getGetWatchlistMoviesQueryKey
} from "@workspace/api-client-react";
import { ListVideo, Plus, LayoutGrid, Film } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function WatchlistSection({ watchlistId, name, isDefault }: { watchlistId: number, name: string, isDefault: boolean }) {
  const { data: movies, isLoading } = useGetWatchlistMovies(watchlistId, {
    query: { enabled: !!watchlistId, queryKey: getGetWatchlistMoviesQueryKey(watchlistId) }
  });

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isDefault ? 'bg-amber-500/10 text-amber-500' : 'bg-gray-800/50 text-gray-300'}`}>
            {name === "Watched" ? <Film size={20} /> : <ListVideo size={20} />}
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{name}</h2>
          <span className="bg-[#111] text-gray-400 text-xs px-2 py-1 rounded-full border border-gray-800 font-medium">
            {movies?.length || 0}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="w-full aspect-[2/3] rounded-xl bg-[#111]" />
          ))}
        </div>
      ) : movies && movies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {movies.map((movie) => (
            <div key={movie.id} className="w-full">
              <MovieCard movie={{ ...movie, backdropPath: null, popularity: 0, genreIds: [], overview: "", releaseYear: movie.releaseYear ?? null, voteAverage: movie.voteAverage ?? 0 }} showRating={false} />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#0a0a0a] border border-gray-800 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center">
          <LayoutGrid size={40} className="text-gray-700 mb-4" />
          <h3 className="text-lg font-bold text-gray-400 mb-2">This list is empty</h3>
          <p className="text-gray-600 max-w-sm">
            Search for movies to add them to your {name.toLowerCase()} list.
          </p>
        </div>
      )}
    </div>
  );
}

export default function Watchlists() {
  const { data: watchlists, isLoading } = useGetWatchlists();
  const createWatchlist = useCreateWatchlist();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [newListName, setNewListName] = useState("");

  const handleCreateList = () => {
    if (!newListName.trim()) return;
    
    createWatchlist.mutate({
      data: { name: newListName.trim() }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["getWatchlists"] });
        setIsOpen(false);
        setNewListName("");
        toast.success("Watchlist created!");
      }
    });
  };

  return (
    <PageTransition>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Your Lists</h1>
          <p className="text-gray-400">Manage what you've seen and what's next.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-red-500 text-black font-bold px-6 py-3 rounded-xl hover:from-amber-400 hover:to-red-400 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)]">
              <Plus size={20} />
              <span>Create New List</span>
            </button>
          </DialogTrigger>
          <DialogContent className="bg-[#111] border-gray-800 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Create a new watchlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">List Name</label>
                <Input 
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g. Sci-Fi Masterpieces" 
                  className="bg-black border-gray-800 focus-visible:ring-amber-500"
                />
              </div>
              <Button 
                onClick={handleCreateList}
                disabled={!newListName.trim() || createWatchlist.isPending}
                className="w-full bg-gradient-to-r from-amber-500 to-red-500 text-black font-bold hover:from-amber-400 hover:to-red-400"
              >
                {createWatchlist.isPending ? "Creating..." : "Create List"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          <Skeleton className="h-10 w-48 bg-[#111]" />
          <div className="flex gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="w-[200px] aspect-[2/3] rounded-xl bg-[#111]" />
            ))}
          </div>
        </div>
      ) : watchlists ? (
        <div className="space-y-4">
          {/* Always show Default lists first, then custom ones */}
          {watchlists.map(list => (
            <WatchlistSection key={list.id} watchlistId={list.id} name={list.name} isDefault={list.isDefault} />
          ))}
        </div>
      ) : null}
    </PageTransition>
  );
}
