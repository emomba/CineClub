import { Link } from "wouter";

export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white flex flex-col items-center justify-center overflow-hidden relative">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-[#050505] to-[#050505] opacity-50"></div>
      
      <div className="z-10 text-center max-w-3xl px-6">
        <div className="mb-8 flex justify-center">
          <img src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/logo.svg`} alt="CineClub Logo" className="w-24 h-24" />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Your private <span className="bg-gradient-to-r from-amber-500 to-red-500 bg-clip-text text-transparent">cinema lounge.</span>
        </h1>
        
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Track what you've watched, discover what to watch next, and share your takes with your tight-knit friend group.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/sign-up" className="bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-black font-semibold px-8 py-4 rounded-xl text-lg transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]">
            Start Your Club
          </Link>
          <Link href="/sign-in" className="text-white hover:text-amber-400 font-medium px-8 py-4 rounded-xl text-lg border border-white/10 hover:border-amber-500/30 transition-all bg-white/5 backdrop-blur-sm">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
