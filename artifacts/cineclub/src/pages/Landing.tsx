import { useLang, LANGS } from "@/lib/i18n";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Globe, ChevronDown, LogIn, UserPlus, Loader2 } from "lucide-react";
import { getSavedAccounts, setLoginHint, type SavedAccount } from "@/lib/auth-token";
import { useAuth } from "@/lib/auth";

export default function Landing() {
  const { t, lang, setLang } = useLang();
  const [, setLocation] = useLocation();
  const { restoreSession } = useAuth();
  const [langOpen, setLangOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [entering, setEntering] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const savedAccounts = getSavedAccounts();
  const [selected, setSelected] = useState<SavedAccount | null>(savedAccounts[0] ?? null);
  const hasSaved = savedAccounts.length > 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const currentLang = LANGS.find(l => l.code === lang) ?? LANGS[0];

  const enterClub = async () => {
    if (!selected) { setLocation("/login"); return; }
    setEntering(true);
    try {
      const ok = await restoreSession(selected);
      if (ok) {
        setLocation("/home");
      } else {
        setLoginHint(selected.username);
        setLocation("/login");
      }
    } finally {
      setEntering(false);
    }
  };

  const Avatar = ({ acc, size = "md" }: { acc: SavedAccount; size?: "sm" | "md" }) => {
    const cls = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";
    return acc.avatarUrl ? (
      <img src={acc.avatarUrl} alt={acc.displayName} className={`${cls} rounded-full object-cover`} />
    ) : (
      <div className={`${cls} rounded-full bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-black font-bold`}>
        {acc.displayName[0].toUpperCase()}
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white flex flex-col items-center justify-center overflow-hidden relative">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-[#050505] to-[#050505] opacity-50" />

      {/* Saved account — top left */}
      {hasSaved && selected && (
        <div className="absolute top-5 left-6 z-20" ref={accountRef}>
          <button
            onClick={() => setAccountOpen(v => !v)}
            className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/30 px-3 py-2 rounded-xl transition-all"
          >
            <Avatar acc={selected} />
            <div className="text-left">
              <div className="text-sm font-medium text-white leading-none">{selected.displayName}</div>
              <div className="text-xs text-gray-500 leading-none mt-0.5">@{selected.username}</div>
            </div>
            <ChevronDown size={14} className={`text-gray-400 transition-transform ml-1 ${accountOpen ? "rotate-180" : ""}`} />
          </button>

          {accountOpen && (
            <div className="absolute left-0 top-full mt-2 w-60 bg-[#111] border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50">
              {savedAccounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => { setSelected(acc); setAccountOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${selected.id === acc.id ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
                >
                  <Avatar acc={acc} size="sm" />
                  <div className="text-left">
                    <div className="font-medium text-white text-xs">{acc.displayName}</div>
                    <div className="text-gray-500 text-[11px]">@{acc.username}</div>
                  </div>
                  {selected.id === acc.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500" />}
                </button>
              ))}
              <div className="border-t border-gray-800">
                <button
                  onClick={() => { setAccountOpen(false); setLocation("/login"); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <LogIn size={13} />
                  <span>Farklı hesapla giriş yap</span>
                </button>
                <button
                  onClick={() => { setAccountOpen(false); setLocation("/register"); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <UserPlus size={13} />
                  <span>Yeni hesap oluştur</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Language — top right */}
      <div className="absolute top-5 right-6 z-20" ref={langRef}>
        <button
          onClick={() => setLangOpen(v => !v)}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/30 text-gray-300 hover:text-white px-3 py-2 rounded-xl text-sm transition-all"
        >
          <img src={`https://flagcdn.com/20x15/${currentLang.countryCode}.png`} alt={currentLang.short} className="w-5 h-auto rounded-sm" />
          <span>{currentLang.label}</span>
          <Globe size={14} className="opacity-60" />
        </button>
        {langOpen && (
          <div className="absolute right-0 top-full mt-2 w-38 bg-[#111] border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50">
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setLangOpen(false); }}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${lang === l.code ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
              >
                <img src={`https://flagcdn.com/20x15/${l.countryCode}.png`} alt={l.short} className="w-4 h-auto rounded-sm" />
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Center content */}
      <div className="z-10 text-center max-w-3xl px-6">
        <div className="mb-8 flex justify-center">
          <img src={`${basePath}/logo.svg`} alt="CineClub Logo" className="w-28 h-28" />
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          {lang === "tr" ? (
            <>Özel <span className="bg-gradient-to-r from-amber-500 to-red-500 bg-clip-text text-transparent">sinema</span> kulübün.</>
          ) : lang === "de" ? (
            <>Dein privater <span className="bg-gradient-to-r from-amber-500 to-red-500 bg-clip-text text-transparent">Kino</span>klub.</>
          ) : lang === "es" ? (
            <>Tu <span className="bg-gradient-to-r from-amber-500 to-red-500 bg-clip-text text-transparent">cine</span>club privado.</>
          ) : lang === "fr" ? (
            <>Ton <span className="bg-gradient-to-r from-amber-500 to-red-500 bg-clip-text text-transparent">ciné</span>club privé.</>
          ) : (
            <>Your private <span className="bg-gradient-to-r from-amber-500 to-red-500 bg-clip-text text-transparent">cinema</span> club.</>
          )}
        </h1>

        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          {t("heroSubtitle")}
        </p>

        {hasSaved ? (
          /* Single button — saved account exists */
          <button
            onClick={enterClub}
            disabled={entering}
            className="relative group px-12 py-4 rounded-2xl text-lg font-bold text-black transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] disabled:opacity-80 disabled:cursor-wait disabled:scale-100 flex items-center justify-center gap-2.5"
            style={{
              background: "linear-gradient(135deg, rgba(245,158,11,0.9) 0%, rgba(239,68,68,0.9) 100%)",
              boxShadow: "0 4px 24px rgba(245,158,11,0.25), 0 1px 0 rgba(255,255,255,0.1) inset",
            }}
          >
            {entering && <Loader2 size={18} className="animate-spin shrink-0" />}
            <span className="relative z-10">
              {lang === "tr" ? "Kulübe Gir" : lang === "de" ? "Club betreten" : lang === "es" ? "Entrar al club" : lang === "fr" ? "Entrer au club" : "Enter the Club"}
            </span>
            <div className="absolute inset-0 rounded-2xl bg-white/0 group-hover:bg-white/10 transition-all duration-200" />
          </button>
        ) : (
          /* Two buttons — no saved account */
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => setLocation("/register")}
              className="relative group px-9 py-4 rounded-2xl text-base font-bold transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: "rgba(255,100,20,0.08)",
                border: "1.5px solid rgba(255,110,30,0.55)",
                color: "#ff7a30",
                boxShadow: "0 0 18px rgba(255,100,20,0.35), 0 0 40px rgba(255,100,20,0.12), inset 0 1px 0 rgba(255,130,60,0.12)",
                textShadow: "0 0 12px rgba(255,120,40,0.7)",
              }}
            >
              <span className="relative z-10">Kayıt Ol</span>
              <div className="absolute inset-0 rounded-2xl bg-orange-500/0 group-hover:bg-orange-500/10 transition-all duration-200" />
            </button>

            <button
              onClick={() => setLocation("/login")}
              className="relative group px-9 py-4 rounded-2xl text-base font-bold transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: "rgba(220,20,30,0.08)",
                border: "1.5px solid rgba(230,30,40,0.55)",
                color: "#f05060",
                boxShadow: "0 0 18px rgba(220,20,30,0.35), 0 0 40px rgba(220,20,30,0.12), inset 0 1px 0 rgba(240,60,70,0.12)",
                textShadow: "0 0 12px rgba(230,40,50,0.7)",
              }}
            >
              <span className="relative z-10">{t("signIn") || "Giriş Yap"}</span>
              <div className="absolute inset-0 rounded-2xl bg-red-500/0 group-hover:bg-red-500/10 transition-all duration-200" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
