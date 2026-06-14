import { useState } from "react";
import { useLocation } from "wouter";
import { Film, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Register() {
  const { signUp } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useLang();
  const [form, setForm] = useState({ username: "", displayName: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password) return;
    if (form.password.length < 8) {
      toast.error(t("passwordTooShort") || "Şifre en az 8 karakter olmalı");
      return;
    }
    if (form.password !== form.confirm) {
      toast.error(t("passwordMismatch") || "Şifreler eşleşmiyor");
      return;
    }
    setLoading(true);
    try {
      await signUp(form.username, form.password, form.displayName || undefined);
      setLocation("/home");
    } catch (err: any) {
      toast.error(err.message || t("registerError") || "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#050505] px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shadow-lg">
            <Film size={32} className="text-black" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">CineClub</h1>
          <p className="text-gray-400 text-sm">{t("registerSubtitle") || "Yeni hesap oluştur"}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#111] border border-gray-800 rounded-2xl p-6 space-y-4"
        >
          <div>
            <label className="text-sm text-gray-400 mb-1.5 block font-medium">
              {t("username") || "Kullanıcı Adı"} <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              autoComplete="username"
              autoFocus
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
              placeholder="kullanici_adi"
              maxLength={20}
              className="bg-black border-gray-800 text-white placeholder-gray-600 focus-visible:ring-amber-500"
            />
            <p className="text-xs text-gray-600 mt-1">3-20 karakter, harf/rakam/_</p>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1.5 block font-medium">
              {t("displayName") || "Görünen Ad"}{" "}
              <span className="text-gray-600 text-xs">({t("optional") || "opsiyonel"})</span>
            </label>
            <Input
              type="text"
              autoComplete="name"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              placeholder={form.username || "Adın"}
              className="bg-black border-gray-800 text-white placeholder-gray-600 focus-visible:ring-amber-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1.5 block font-medium">
              {t("password") || "Şifre"} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="En az 8 karakter"
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

          <div>
            <label className="text-sm text-gray-400 mb-1.5 block font-medium">
              {t("confirmNewPassword") || "Şifre Tekrar"} <span className="text-red-500">*</span>
            </label>
            <Input
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              placeholder="••••••••"
              className="bg-black border-gray-800 text-white placeholder-gray-600 focus-visible:ring-amber-500"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !form.username || !form.password || !form.confirm}
            className="w-full bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-black font-bold py-2.5 disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : (t("register") || "Kayıt Ol")}
          </Button>
        </form>

        <p className="text-center mt-4 text-gray-500 text-sm">
          {t("haveAccount") || "Zaten hesabın var mı?"}{" "}
          <button
            onClick={() => setLocation("/login")}
            className="text-amber-400 hover:text-amber-300 font-medium"
          >
            {t("login") || "Giriş Yap"}
          </button>
        </p>
      </div>
    </div>
  );
}
