import { Link } from "wouter";
import { useLang, LANGS } from "@/lib/i18n";
import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";

export default function Landing() {
  const { t, lang, setLang } = useLang();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const currentLang = LANGS.find(l => l.code === lang) ?? LANGS[0];

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white flex flex-col items-center justify-center overflow-hidden relative">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-[#050505] to-[#050505] opacity-50"></div>

      {/* Language selector - top right */}
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

      <div className="z-10 text-center max-w-3xl px-6">
        <div className="mb-8 flex justify-center">
          <img src={`${basePath}/logo.svg`} alt="CineClub Logo" className="w-24 h-24" />
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

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/sign-up" className="bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-black font-semibold px-8 py-4 rounded-xl text-lg transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]">
            {t("startClub")}
          </Link>
          <Link href="/sign-in" className="text-white hover:text-amber-400 font-medium px-8 py-4 rounded-xl text-lg border border-white/10 hover:border-amber-500/30 transition-all bg-white/5 backdrop-blur-sm">
            {t("signIn")}
          </Link>
        </div>
      </div>
    </div>
  );
}
