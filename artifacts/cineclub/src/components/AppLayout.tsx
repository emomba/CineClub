import { ReactNode } from "react";
import { Sidebar, MobileNav } from "./Navigation";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] bg-[#050505] text-white">
      <Sidebar />
      <main className="flex-1 w-full pb-20 md:pb-0 h-[100dvh] overflow-y-auto">
        <div className="max-w-6xl mx-auto w-full p-4 md:p-8">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
