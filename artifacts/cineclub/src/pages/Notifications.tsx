import { PageTransition } from "@/components/PageTransition";
import { useGetNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from "@workspace/api-client-react";
import { Bell, Check, Users, MessageSquare, Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { getGetNotificationsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

export default function Notifications() {
  const { data: notifications, isLoading } = useGetNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const queryClient = useQueryClient();

  const handleMarkRead = (id: number) => {
    markRead.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
      }
    });
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
      }
    });
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'friend_request': return <Users size={20} className="text-blue-500" />;
      case 'friend_accept': return <Users size={20} className="text-green-500" />;
      case 'recommendation': return <MessageSquare size={20} className="text-amber-500" />;
      default: return <Bell size={20} className="text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-10 w-48 bg-[#111] mb-8" />
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full bg-[#111] rounded-xl" />
        ))}
      </div>
    );
  }

  const hasUnread = notifications?.some(n => !n.read);

  return (
    <PageTransition className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Notifications</h1>
          <p className="text-gray-400">Activity from your club.</p>
        </div>
        {hasUnread && (
          <Button 
            onClick={handleMarkAllRead}
            variant="ghost" 
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <Check size={16} className="mr-2" /> Mark all read
          </Button>
        )}
      </div>

      {notifications && notifications.length > 0 ? (
        <div className="space-y-2 bg-[#111] border border-gray-800 rounded-3xl p-2">
          {notifications.map(notif => (
            <div 
              key={notif.id} 
              className={`p-4 rounded-2xl flex items-start gap-4 transition-colors ${notif.read ? 'opacity-60' : 'bg-gray-800/30'}`}
              onClick={() => !notif.read && handleMarkRead(notif.id)}
            >
              <div className="mt-1 shrink-0 p-2 bg-black rounded-full border border-gray-800">
                {getIcon(notif.type)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-200">
                  {/* We parse simple notification messages assuming data has a 'message' field */}
                  {notif.data && typeof notif.data === 'object' && 'message' in notif.data 
                    ? String(notif.data.message) 
                    : "New activity"}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
              {!notif.read && (
                <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-2 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-[#0a0a0a] rounded-3xl border border-dashed border-gray-800">
          <Bell className="mx-auto text-gray-700 mb-4" size={48} />
          <h3 className="text-xl font-bold text-gray-300 mb-2">All caught up</h3>
          <p className="text-gray-500">You have no notifications right now.</p>
        </div>
      )}
    </PageTransition>
  );
}
