import { PageTransition } from "@/components/PageTransition";
import { useGetRecommendationInbox, useMarkRecommendationRead } from "@workspace/api-client-react";
import { MessageSquare, Check, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetRecommendationInboxQueryKey } from "@workspace/api-client-react";
import { getPosterUrl } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Recommendations() {
  const { data: recs, isLoading } = useGetRecommendationInbox();
  const markRead = useMarkRecommendationRead();
  const queryClient = useQueryClient();

  const handleMarkRead = (id: number) => {
    markRead.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetRecommendationInboxQueryKey() });
        toast.success("Marked as seen");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-64 bg-[#111] mb-8" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-40 w-full bg-[#111] rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <PageTransition className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Inbox</h1>
        <p className="text-gray-400">Movies your friends think you should watch.</p>
      </div>

      {recs && recs.length > 0 ? (
        <div className="space-y-4">
          {recs.map(rec => (
            <div key={rec.id} className={`bg-[#111] border ${rec.seen ? 'border-gray-800/50 opacity-70' : 'border-amber-500/30'} rounded-2xl p-5 flex flex-col md:flex-row gap-6 relative overflow-hidden group`}>
              
              <Link href={`/movie/${rec.tmdbId}`}>
                <div className="w-24 md:w-32 aspect-[2/3] shrink-0 rounded-xl overflow-hidden bg-gray-900 border border-gray-800 shadow-xl cursor-pointer hover:scale-105 transition-transform">
                  <img 
                    src={getPosterUrl(rec.movie.posterPath)} 
                    alt={rec.movie.title} 
                    className="w-full h-full object-cover"
                  />
                </div>
              </Link>
              
              <div className="flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden flex items-center justify-center shrink-0">
                    {rec.fromUser.avatarUrl ? (
                      <img src={rec.fromUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={16} className="text-gray-500" />
                    )}
                  </div>
                  <div className="text-sm text-gray-400">
                    <span className="font-bold text-white">{rec.fromUser.displayName || rec.fromUser.username}</span> recommended
                  </div>
                  <div className="text-xs text-gray-600 ml-auto">
                    {new Date(rec.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <Link href={`/movie/${rec.tmdbId}`}>
                  <h3 className="font-bold text-2xl mb-2 hover:text-amber-500 transition-colors cursor-pointer">{rec.movie.title}</h3>
                </Link>

                {rec.message && (
                  <div className="bg-black/50 p-4 rounded-xl border border-gray-800/50 mt-2 flex-1">
                    <p className="text-gray-300 italic">"{rec.message}"</p>
                  </div>
                )}
                
                {!rec.seen && (
                  <div className="mt-4 flex justify-end">
                    <Button 
                      onClick={() => handleMarkRead(rec.id)}
                      variant="outline"
                      className="bg-transparent border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
                    >
                      <Check size={16} className="mr-2" /> Mark Seen
                    </Button>
                  </div>
                )}
              </div>

              {!rec.seen && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-500/20 to-transparent pointer-events-none" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-[#0a0a0a] rounded-3xl border border-dashed border-gray-800">
          <MessageSquare className="mx-auto text-gray-700 mb-4" size={48} />
          <h3 className="text-xl font-bold text-gray-300 mb-2">No recommendations</h3>
          <p className="text-gray-500">Your inbox is empty. Time to ask your friends for some picks!</p>
        </div>
      )}
    </PageTransition>
  );
}
