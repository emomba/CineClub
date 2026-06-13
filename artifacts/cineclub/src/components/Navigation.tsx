import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Home, Search, ListVideo, Users, User, Bell, MessageSquare, Dices, LogOut, Globe } from "lucide-react";
import { useClerk } from "@clerk/react";
import { useGetNotifications, useGetRecommendationInbox } from "@workspace/api-client-react";
import { useLang, LANGS } from "@/lib/i18n";

export function Sidebar() {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const { t, lang, setLang } = useLang();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const { data: notifications } = useGetNotifications();
  const { data: recs } = useGetRecommendationInbox();

  const unreadNotifs = notifications?.filter(n => !n.read).length || 0;
  const unreadRecs = recs?.filter(r => !r.seen).length || 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const navItems = [
    { icon: Home, label: t("home"), href: "/home" },
    { icon: Search, label: t("search"), href: "/search" },
    { icon: ListVideo, label: t("watchlists"), href: "/watchlists" },
    { icon: Dices, label: t("randomPick"), href: "/random-pick" },
    { icon: Users, label: t("friends"), href: "/friends" },
    {
      icon: MessageSquare,
      label: t("recommendations"),
      href: "/recommendations",
      badge: unreadRecs > 0 ? unreadRecs : 0
    },
    {
      icon: Bell,
      label: t("notifications"),
      href: "/notifications",
      badge: unreadNotifs > 0 ? unreadNotifs : 0
    },
    { icon: User, label: t("profile"), href: "/profile" },
  ];

  const currentFlag = LANGS.find(l => l.code === lang)?.flag ?? "🇹🇷";

  return (
    <div className="w-64 bg-[#050505] border-r border-[#1a1a1a] h-[100dvh] sticky top-0 flex flex-col hidden md:flex">
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={`${basePath}/logo.svg`} alt="CineClub" className="w-8 h-8" />
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-amber-500 to-red-500 bg-clip-text text-transparent">CineClub</span>
        </div>

        {/* Language selector */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setLangOpen(v => !v)}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm px-2 py-1 rounded-lg hover:bg-white/5"
            title={t("language")}
          >
            <span className="text-base leading-none">{currentFlag}</span>
            <Globe size={13} className="opacity-60" />
          </button>
          {langOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-[#111] border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50">
              {LANGS.map(l => (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code); setLangOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${lang === l.code ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
                >
                  <span>{l.flag}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
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
          <span className="font-medium">{t("logout")}</span>
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
