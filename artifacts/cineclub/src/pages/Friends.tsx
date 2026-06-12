import { PageTransition } from "@/components/PageTransition";
import { 
  useGetFriends, 
  useGetFriendRequests,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useRejectFriendRequest,
  useRemoveFriend,
  getGetFriendsQueryKey,
  getGetFriendRequestsQueryKey
} from "@workspace/api-client-react";
import { UserPlus, UserMinus, Check, X, Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function Friends() {
  const { data: friends, isLoading: loadingFriends } = useGetFriends();
  const { data: requests, isLoading: loadingRequests } = useGetFriendRequests();
  const queryClient = useQueryClient();
  
  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const rejectRequest = useRejectFriendRequest();
  const removeFriend = useRemoveFriend();

  const [username, setUsername] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSendRequest = () => {
    if (!username.trim()) return;
    sendRequest.mutate({ data: { targetUsername: username.trim() } }, {
      onSuccess: () => {
        toast.success("Friend request sent!");
        setUsername("");
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || "Failed to send request");
      }
    });
  };

  const handleAccept = (friendshipId: number) => {
    acceptRequest.mutate({ id: friendshipId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetFriendsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFriendRequestsQueryKey() });
        toast.success("Friend request accepted!");
      }
    });
  };

  const handleReject = (friendshipId: number) => {
    rejectRequest.mutate({ id: friendshipId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetFriendRequestsQueryKey() });
      }
    });
  };

  const handleRemove = (friendshipId: number) => {
    if (!confirm("Are you sure you want to remove this friend?")) return;
    removeFriend.mutate({ id: friendshipId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetFriendsQueryKey() });
        toast.success("Friend removed");
      }
    });
  };

  const filteredFriends = friends?.filter(f => {
    const name = f.otherUser?.username?.toLowerCase() ?? "";
    const display = f.otherUser?.displayName?.toLowerCase() ?? "";
    const q = searchQuery.toLowerCase();
    return name.includes(q) || display.includes(q);
  });

  return (
    <PageTransition className="space-y-10 max-w-4xl mx-auto">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Friends</h1>
        <p className="text-gray-400">Manage your club members and share your cinematic journey.</p>
      </div>

      <div className="bg-[#111] border border-gray-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4">Add Friend</h2>
        <div className="flex gap-3">
          <Input 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendRequest()}
            placeholder="Enter username..."
            className="bg-black border-gray-800 focus-visible:ring-amber-500 h-12"
            data-testid="input-friend-username"
          />
          <Button 
            onClick={handleSendRequest}
            disabled={!username.trim() || sendRequest.isPending}
            className="bg-gradient-to-r from-amber-500 to-red-500 text-black font-bold h-12 px-6 hover:from-amber-400 hover:to-red-400"
            data-testid="button-send-friend-request"
          >
            <UserPlus size={20} className="mr-2" />
            Send Request
          </Button>
        </div>
      </div>

      {requests && requests.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4 text-amber-500">Pending Requests</h2>
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id} className="bg-[#111] border border-gray-800 rounded-xl p-4 flex items-center justify-between" data-testid={`card-friend-request-${req.id}`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center overflow-hidden">
                    {req.otherUser?.avatarUrl ? (
                      <img src={req.otherUser.avatarUrl} alt={req.otherUser.username} className="w-full h-full object-cover" />
                    ) : (
                      <User className="text-gray-500" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold">{req.otherUser?.displayName || req.otherUser?.username}</div>
                    <div className="text-gray-400 text-sm">@{req.otherUser?.username}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleAccept(req.id)}
                    className="bg-green-500/20 text-green-500 hover:bg-green-500/30 border border-green-500/30"
                    size="sm"
                    data-testid={`button-accept-${req.id}`}
                  >
                    <Check size={16} className="mr-1" /> Accept
                  </Button>
                  <Button 
                    onClick={() => handleReject(req.id)}
                    variant="outline" 
                    size="sm"
                    className="border-gray-700 bg-transparent hover:bg-gray-800 text-gray-300"
                    data-testid={`button-reject-${req.id}`}
                  >
                    <X size={16} className="mr-1" /> Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Your Club ({friends?.length || 0})</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends..." 
              className="bg-[#111] border-gray-800 pl-9 h-10 text-sm focus-visible:ring-amber-500"
              data-testid="input-search-friends"
            />
          </div>
        </div>

        {loadingFriends ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full bg-[#111] rounded-xl" />
            ))}
          </div>
        ) : filteredFriends && filteredFriends.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredFriends.map(friend => (
              <div key={friend.id} className="bg-[#111] border border-gray-800 rounded-xl p-4 flex items-center justify-between group hover:border-gray-700 transition-colors" data-testid={`card-friend-${friend.id}`}>
                <Link href={`/friends/${friend.otherUser?.username}`}>
                  <div className="flex items-center gap-4 cursor-pointer">
                    <div className="w-14 h-14 bg-gray-800 rounded-full flex items-center justify-center overflow-hidden border border-gray-700">
                      {friend.otherUser?.avatarUrl ? (
                        <img src={friend.otherUser.avatarUrl} alt={friend.otherUser.username} className="w-full h-full object-cover" />
                      ) : (
                        <User className="text-gray-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-lg group-hover:text-amber-500 transition-colors">{friend.otherUser?.displayName || friend.otherUser?.username}</div>
                      <div className="text-gray-400 text-sm mb-1">@{friend.otherUser?.username}</div>
                      <div className="flex gap-3 text-xs text-gray-500 font-medium">
                        <span>{friend.otherUser?.watchedCount || 0} watched</span>
                        <span>•</span>
                        <span>{friend.otherUser?.reviewCount || 0} reviews</span>
                      </div>
                    </div>
                  </div>
                </Link>
                <button 
                  onClick={() => handleRemove(friend.id)}
                  className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove friend"
                  data-testid={`button-remove-friend-${friend.id}`}
                >
                  <UserMinus size={18} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-[#0a0a0a] rounded-2xl border border-dashed border-gray-800">
            <User className="mx-auto text-gray-700 mb-3" size={40} />
            <h3 className="font-bold text-gray-300">No friends found</h3>
            <p className="text-sm text-gray-500 mt-1">Start adding friends to build your club!</p>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
