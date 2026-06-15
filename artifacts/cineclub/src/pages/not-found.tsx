import { AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050505]">
      <div className="text-center space-y-4">
        <AlertCircle className="h-16 w-16 text-amber-500 mx-auto" />
        <h1 className="text-4xl font-black text-white">404</h1>
        <p className="text-gray-400">Bu sayfa bulunamadı</p>
        <button
          onClick={() => setLocation("/")}
          className="mt-4 px-6 py-2 bg-gradient-to-r from-amber-500 to-red-500 text-black font-bold rounded-xl hover:from-amber-400 hover:to-red-400 transition-all"
        >
          Ana Sayfaya Dön
        </button>
      </div>
    </div>
  );
}
