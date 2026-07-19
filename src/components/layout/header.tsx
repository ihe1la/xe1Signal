"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Bell, LogOut, Menu, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Header({ reserveRightSidebar = true }: { reserveRightSidebar?: boolean }) {
  const router = useRouter();
  const { status } = useSession();
  const [query, setQuery] = React.useState("");
  const [mobileSearch, setMobileSearch] = React.useState(false);
  const [unread,setUnread]=React.useState(0);

  React.useEffect(() => {
    if (status !== "authenticated") {
      setUnread(0);
      return;
    }

    let active = true;
    const load = () => fetch("/api/notifications")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active) {
          setUnread((data?.notifications || []).filter((item: { isRead: boolean }) => !item.isRead).length);
        }
      })
      .catch(() => undefined);

    load();
    const timer = window.setInterval(load, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [status]);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && !["INPUT", "TEXTAREA"].includes((event.target as HTMLElement).tagName)) {
        event.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    router.push(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : "/search");
    setMobileSearch(false);
  }

  return (
    <>
      <header className="sticky top-0 z-30 h-20 border-b border-white/[0.055] bg-[#08090d]/90 backdrop-blur-xl">
        <div className={cn("mx-auto flex h-full max-w-[1536px] items-center gap-4 px-4 sm:px-7 lg:px-11", reserveRightSidebar && "2xl:pr-[348px]")}>
          <button onClick={() => setMobileSearch(true)} className="grid h-10 w-10 place-items-center rounded-lg border border-white/[0.07] text-zinc-400 lg:hidden" aria-label="Open search"><Menu className="h-5 w-5" /></button>
          <form onSubmit={submit} className="relative hidden max-w-[720px] flex-1 md:block">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input id="global-search" value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 w-full rounded-[10px] border border-white/[0.07] bg-white/[0.025] pl-11 pr-12 font-mono text-[13px] text-zinc-200 outline-none transition focus:border-violet-400/30 focus:bg-white/[0.04]" placeholder="Search signals, frequencies, people..." />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-white/[0.06] bg-white/[0.035] px-2 py-1 font-mono text-[10px] text-zinc-600">/</kbd>
          </form>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <Button asChild className="h-10 rounded-lg bg-violet-400/[0.09] px-4 font-mono text-[13px] text-violet-300 hover:bg-violet-400/[0.15]"><Link href="/signals/new"><Plus className="mr-2 h-4 w-4" />New signal</Link></Button>
            <Button asChild variant="ghost" size="icon" className="relative text-zinc-400"><Link href="/notifications" aria-label={unread?`Notifications, ${unread} unread`:"Notifications"}><Bell className="h-[18px] w-[18px]" />{unread>0&&<span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-violet-400 px-1 font-mono text-[8px] text-white">{unread>9?"9+":unread}</span>}</Link></Button>
            <Button onClick={() => signOut({ callbackUrl: "/login" })} variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-200" aria-label="Log out"><LogOut className="h-[18px] w-[18px]" /></Button>
          </div>
        </div>
      </header>
      {mobileSearch && (
        <div className="fixed inset-0 z-50 bg-[#08090d] p-5 md:hidden">
          <div className="mb-8 flex items-center justify-between"><span className="font-mono tracking-[.22em]">SIGNAL ARCHIVE</span><button onClick={() => setMobileSearch(false)}><X /></button></div>
          <form onSubmit={submit} className="relative"><Search className="absolute left-4 top-4 h-5 w-5 text-zinc-500" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the archive..." className="h-14 w-full rounded-xl border border-white/10 bg-white/[.03] pl-12 pr-4 font-mono outline-none" /></form>
        </div>
      )}
    </>
  );
}
