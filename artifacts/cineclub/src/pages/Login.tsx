import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Film, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getAndClearLoginHint } from "@/lib/auth-token";

export default function Login() {
  const { signIn, isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useLang();
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hint = getAndClearLoginHint();
    if (hint) setForm(f => ({ ...f, username: hint }));
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn) setLocation("/home");
  }, [isLoaded, isSignedIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password) return;
    setLoading(true);
    try {
      await signIn(form.username, form.password);
      setLocation("/home");
    } catch (err: any) {
      toast.error(err.message || t("loginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#050505] px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-3">
          <img src="/logo.svg" alt="CineClub" className="w-20 h-20" />
          <h1 className="text-3xl font-black text-white tracking-tight">CineClub</h1>
          <p className="text-gray-400 text-sm">{t("loginSubtitle") || "Hesabına giriş yap"}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#111] border border-gray-800 rounded-2xl p-6 space-y-4"
        >
          <div>
            <label className="text-sm text-gray-400 mb-1.5 block font-medium">{t("username") || "Kullanıcı Adı"}</label>
            <Input
              type="text"
              autoComplete="username"
              autoFocus
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              placeholder="kullanici_adi"
              className="bg-black border-gray-800 text-white placeholder-gray-600 focus-visible:ring-amber-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1.5 block font-medium">{t("password") || "Şifre"}</label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="bg-black border-gray-800 text-white placeholder-gray-600 focus-visible:ring-amber-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !form.username || !form.password}
            className="w-full bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-black font-bold py-2.5 disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : (t("login") || "Giriş Yap")}
          </Button>
        </form>

        <p className="text-center mt-4 text-gray-500 text-sm">
          {t("noAccount") || "Hesabın yok mu?"}{" "}
          <button
            onClick={() => setLocation("/register")}
            className="text-amber-400 hover:text-amber-300 font-medium"
          >
            {t("register") || "Kayıt Ol"}
          </button>
        </p>

        <p className="text-center mt-2 text-gray-600 text-sm">
          <button onClick={() => setLocation("/")} className="hover:text-gray-400 transition-colors">
            ← Geri Dön
          </button>
        </p>
      </div>
    </div>
  );
}
