"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import * as React from "react";
import { BookOpen, CircleUserRound, Compass, Grid2X2, Headphones, Plus, Settings, Timer, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { StrengthBars } from "@/components/layout/right-sidebar";
import type { LucideIcon } from "lucide-react";

type SidebarSummary = {
  profile: { username: string; name: string; avatarUrl: string | null; strength: number } | null;
};

const navigation: ReadonlyArray<readonly [string, string, LucideIcon]> = [
  ["/discover", "Discover", Compass], ["/archive", "Library", BookOpen],
  ["/vibe", "Vibe", Headphones], ["/study", "Study", Timer], ["/tools", "Tools", Grid2X2],
  ["/people", "People", Users],
];

const pinnedCollections = [
  ["Songs that hurt", "/archive?tab=collections&q=Songs%20that%20hurt"],
  ["Beautiful interfaces", "/archive?tab=collections&q=Beautiful%20interfaces"],
  ["Broken flows", "/archive?tab=collections&q=Broken%20flows"],
  ["Late-night thoughts", "/archive?tab=collections&q=Late-night%20thoughts"],
] as const;

export function LeftSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [summary, setSummary] = React.useState<SidebarSummary>({ profile: null });
  React.useEffect(() => {
    if (!session?.user?.id) return;
    let active = true;
    fetch("/api/sidebar").then((response) => response.ok ? response.json() : null).then((data) => { if (active && data) setSummary(data); }).catch(() => undefined);
    return () => { active = false; };
  }, [session?.user?.id, pathname]);
  const username = summary.profile?.username || session?.user?.username || "user";
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col border-r border-white/[0.055] bg-[#08090d] lg:flex">
      <Link href="/discover" className="flex h-20 items-center justify-center border-b border-white/[0.055] px-5 text-center font-mono text-[13px] font-medium tracking-[.24em] text-zinc-100">SIGNAL ARCHIVE<span className="ml-2.5 h-1.5 w-1.5 rounded-full bg-violet-400" /></Link>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-7 py-9">
        <nav className="space-y-1">
          {navigation.map(([href, label, Icon]) => { const active = href === "/archive" ? pathname === "/archive" || pathname.startsWith("/frequencies") : pathname === href || pathname.startsWith(`${href}/`); return (
            <Link key={href} href={href} className={cn("flex h-11 items-center gap-4 rounded-[9px] px-3 font-mono text-[13px] transition", active ? "bg-white/[0.035] text-zinc-100" : "text-zinc-500 hover:bg-white/[0.025] hover:text-zinc-300")}><Icon className={cn("h-[18px] w-[18px]", active && "text-violet-400")} /><span>{label}</span></Link>
          ); })}
        </nav>
        <div className="mb-5 mt-14 flex items-center justify-between px-2 font-mono text-[10px] uppercase tracking-[.16em] text-zinc-500"><span>Pinned Collections</span><Link href="/frequencies/new" aria-label="Create collection"><Plus className="h-4 w-4" /></Link></div>
        <div className="space-y-1">
          {pinnedCollections.map(([name, href]) => <Link href={href} key={name} className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-mono text-[12px] text-zinc-500 transition hover:bg-white/[.025] hover:text-zinc-300"><span className="h-2 w-2 rounded-full bg-violet-400/70" /><span className="truncate">{name}</span></Link>)}
          <Link href="/archive?tab=collections" className="mt-3 inline-flex px-3 font-mono text-[10px] text-violet-300/80 transition hover:text-violet-200">View all collections →</Link>
        </div>
      </div>
      <div className="mx-4 mb-4 rounded-[8px] border border-white/[.055] bg-white/[.018] p-2.5">
        <div className="flex items-center gap-2.5">
          <Link href={`/profile/${username}`} className="flex min-w-0 flex-1 items-center gap-2.5">
            {summary.profile?.avatarUrl ? <img src={summary.profile.avatarUrl} alt={username} className="h-8 w-8 shrink-0 rounded-[6px] border border-white/[.10] bg-black object-cover" /> : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] border border-white/[.10] bg-white/[.035]"><CircleUserRound className="h-4 w-4 text-zinc-500" /></span>}
            <span className="min-w-0">
              <span className="block truncate font-mono text-[10px] font-medium text-zinc-200">{username}</span>
              <span className="mt-1 flex"><StrengthBars value={summary.profile?.strength || 0}/></span>
            </span>
          </Link>
          <Link href="/settings" aria-label="Settings" className="rounded-md p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"><Settings className="h-3.5 w-3.5"/></Link>
        </div>
      </div>
    </aside>
  );
}
