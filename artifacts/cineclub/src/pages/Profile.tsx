import { PageTransition } from "@/components/PageTransition";
import { useGetMe, useUpdateMe, useGetUserReviews, getGetUserReviewsQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Settings, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";

export default function Profile() {
  const { data: user, isLoading } = useGetMe();
  const updateMe = useUpdateMe();
  const queryClient = useQueryClient();
  
  const { data: reviews } = useGetUserReviews(user?.clerkId || "", {
    query: { enabled: !!user?.clerkId, queryKey: getGetUserReviewsQueryKey(user?.clerkId || "") }
  });

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    username: "",
    bio: "",
    avatarUrl: ""
  });

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || "",
        username: user.username || "",
        bio: user.bio || "",
        avatarUrl: user.avatarUrl || ""
      });
    }
  }, [user]);

  const handleSave = () => {
    updateMe.mutate({
      data: formData
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setIsEditing(false);
        toast.success("Profile updated successfully");
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || "Failed to update profile");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <Skeleton className="h-64 w-full bg-[#111] rounded-3xl" />
      </div>
    );
  }

  return (
    <PageTransition className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Your Profile</h1>
        <p className="text-gray-400">Manage your identity in the club.</p>
      </div>

      <div className="bg-[#111] border border-gray-800 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              if (isEditing) handleSave();
              else setIsEditing(true);
            }}
            disabled={isEditing && updateMe.isPending}
            className={`border-gray-700 bg-black/50 backdrop-blur-md text-white hover:bg-gray-800 ${isEditing ? 'border-amber-500 text-amber-500' : ''}`}
          >
            {isEditing ? (
              <><Save size={16} className="mr-2" /> {updateMe.isPending ? 'Saving...' : 'Save Changes'}</>
            ) : (
              <><Settings size={16} className="mr-2" /> Edit Profile</>
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
                  <label className="text-sm font-medium text-gray-400 mb-1 block">Display Name</label>
                  <Input 
                    value={formData.displayName} 
                    onChange={e => setFormData({...formData, displayName: e.target.value})}
                    className="bg-black border-gray-800 focus-visible:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-1 block">Username</label>
                  <Input 
                    value={formData.username} 
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    className="bg-black border-gray-800 focus-visible:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-1 block">Avatar URL</label>
                  <Input 
                    value={formData.avatarUrl} 
                    onChange={e => setFormData({...formData, avatarUrl: e.target.value})}
                    className="bg-black border-gray-800 focus-visible:ring-amber-500"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-1 block">Bio</label>
                  <Textarea 
                    value={formData.bio} 
                    onChange={e => setFormData({...formData, bio: e.target.value})}
                    className="bg-black border-gray-800 focus-visible:ring-amber-500 resize-none h-24"
                  />
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <h2 className="text-3xl font-bold tracking-tight mb-1">{user?.displayName || user?.username}</h2>
                <p className="text-amber-500 font-medium mb-4">@{user?.username}</p>
                <p className="text-gray-300 max-w-xl leading-relaxed">{user?.bio || "No bio added yet."}</p>
              </div>
            )}
          </div>
        </div>

        {!isEditing && (
          <div className="grid grid-cols-3 gap-4 mt-10 pt-8 border-t border-gray-800">
            <div className="bg-black/50 rounded-2xl p-4 text-center border border-gray-800/50">
              <div className="text-3xl font-bold text-white mb-1">{user?.watchedCount || 0}</div>
              <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">Movies Watched</div>
            </div>
            <div className="bg-black/50 rounded-2xl p-4 text-center border border-gray-800/50">
              <div className="text-3xl font-bold text-white mb-1">{user?.reviewCount || 0}</div>
              <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">Reviews Written</div>
            </div>
            <div className="bg-black/50 rounded-2xl p-4 text-center border border-gray-800/50">
              <div className="text-3xl font-bold text-white mb-1">{user?.friendCount || 0}</div>
              <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">Friends</div>
            </div>
          </div>
        )}
      </div>

      {!isEditing && reviews && reviews.length > 0 && (
        <div className="pt-8">
          <h3 className="text-2xl font-bold mb-6">Your Recent Reviews</h3>
          <div className="space-y-4">
            {reviews.slice(0, 5).map(review => (
              <Link key={review.id} href={`/movie/${review.tmdbId}`}>
                <div className="bg-[#111] border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors cursor-pointer group flex flex-col md:flex-row gap-6">
                  {review.moviePosterPath && (
                    <img 
                      src={`https://image.tmdb.org/t/p/w200${review.moviePosterPath}`} 
                      className="w-24 rounded-lg object-cover shadow-lg border border-gray-800 group-hover:border-amber-500/50 transition-colors"
                      alt=""
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-bold text-xl mb-2 group-hover:text-amber-500 transition-colors">{review.movieTitle}</h4>
                    <p className="text-gray-400 line-clamp-2 leading-relaxed">{review.content}</p>
                  </div>
                  <div className="text-xl font-bold text-amber-500">
                    ★ {review.rating}<span className="text-gray-600 text-sm">/10</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </PageTransition>
  );
}
