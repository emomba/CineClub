import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, Search, ListVideo, Users, User, Bell, MessageSquare, Dices, LogOut } from "lucide-react";
import { useClerk } from "@clerk/react";
import { useGetNotifications, useGetRecommendationInbox } from "@workspace/api-client-react";

export function Sidebar() {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const { data: notifications } = useGetNotifications();
  const { data: recs } = useGetRecommendationInbox();

  const unreadNotifs = notifications?.filter(n => !n.read).length || 0;
  const unreadRecs = recs?.filter(r => !r.seen).length || 0;

  const navItems = [
    { icon: Home, label: "Home", href: "/home" },
    { icon: Search, label: "Search", href: "/search" },
    { icon: ListVideo, label: "Watchlists", href: "/watchlists" },
    { icon: Dices, label: "Random Pick", href: "/random-pick" },
    { icon: Users, label: "Friends", href: "/friends" },
    { 
      icon: MessageSquare, 
      label: "Recommendations", 
      href: "/recommendations",
      badge: unreadRecs > 0 ? unreadRecs : 0
    },
    { 
      icon: Bell, 
      label: "Notifications", 
      href: "/notifications",
      badge: unreadNotifs > 0 ? unreadNotifs : 0
    },
    { icon: User, label: "Profile", href: "/profile" },
  ];

  return (
    <div className="w-64 bg-[#050505] border-r border-[#1a1a1a] h-[100dvh] sticky top-0 flex flex-col hidden md:flex">
      <div className="p-6 flex items-center gap-3">
        <img src={`${basePath}/logo.svg`} alt="CineClub" className="w-8 h-8" />
        <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-amber-500 to-red-500 bg-clip-text text-transparent">CineClub</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer ${
                isActive 
                  ? "bg-white/10 text-white shadow-[inset_2px_0_0_0_#f59e0b]" 
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}>
                <div className="flex items-center gap-3">
                  <item.icon size={20} className={isActive ? "text-amber-500" : ""} />
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.badge ? (
                  <span className="bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#1a1a1a]">
        <button 
          onClick={() => signOut({ redirectUrl: basePath || "/" })}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all"
        >
          <LogOut size={20} />
          <span className="font-medium">Log out</span>
        </button>
      </div>
    </div>
  );
}

export function MobileNav() {
  const [location] = useLocation();

  const navItems = [
    { icon: Home, href: "/home" },
    { icon: Search, href: "/search" },
    { icon: Dices, href: "/random-pick" },
    { icon: User, href: "/profile" },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#050505]/90 backdrop-blur-md border-t border-[#1a1a1a] flex justify-around p-3 z-50">
      {navItems.map((item) => {
        const isActive = location === item.href || location.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href}>
            <div className={`p-2 rounded-xl transition-all ${isActive ? "text-amber-500" : "text-gray-400"}`}>
              <item.icon size={24} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
