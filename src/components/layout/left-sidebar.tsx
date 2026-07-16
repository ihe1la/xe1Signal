"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import * as React from "react";
import { Archive, Bell, CircleUserRound, Compass, Mail, Plus, Radio, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { StrengthBars } from "@/components/layout/right-sidebar";

type SidebarSummary = {
  profile: { username: string; name: string; avatarUrl: string | null; strength: number } | null;
  frequencies: { id: string; name: string; signalCount: number }[];
};

const navigation = [
  ["/discover", "Discover", Compass], ["/frequencies", "Frequencies", Radio], ["/archive", "Archive", Archive],
  ["/people", "People", Users], ["/inbox", "Inbox", Mail], ["/notifications", "Notifications", Bell],
] as const;

export function LeftSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [summary, setSummary] = React.useState<SidebarSummary>({ profile: null, frequencies: [] });
  React.useEffect(() => {
    if (!session?.user?.id) return;
    let active = true;
    fetch("/api/sidebar").then((response) => response.ok ? response.json() : null).then((data) => { if (active && data) setSummary(data); }).catch(() => undefined);
    return () => { active = false; };
  }, [session?.user?.id, pathname]);
  const username = summary.profile?.username || session?.user?.username || "user";
  const name = summary.profile?.name || session?.user?.name || username;
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col border-r border-white/[0.055] bg-[#08090d] lg:flex">
      <Link href="/discover" className="flex h-20 items-center border-b border-white/[0.055] px-9 font-mono text-[15px] tracking-[.24em] text-zinc-100">SIGNAL ARCHIVE<span className="ml-3 h-1.5 w-1.5 rounded-full bg-violet-400" /></Link>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-7 py-9">
        <nav className="space-y-1">
          {navigation.map(([href, label, Icon]) => { const active = pathname === href || pathname.startsWith(`${href}/`); return (
            <Link key={href} href={href} className={cn("flex h-11 items-center gap-4 rounded-[9px] px-3 font-mono text-[13px] transition", active ? "bg-white/[0.035] text-zinc-100" : "text-zinc-500 hover:bg-white/[0.025] hover:text-zinc-300")}><Icon className={cn("h-[18px] w-[18px]", active && "text-violet-400")} /><span>{label}</span></Link>
          ); })}
        </nav>
        <div className="mb-5 mt-14 flex items-center justify-between px-2 font-mono text-[10px] uppercase tracking-[.16em] text-zinc-500"><span>My frequencies</span><Link href="/frequencies/new" aria-label="Create frequency"><Plus className="h-4 w-4" /></Link></div>
        <div className="space-y-1">
          {summary.frequencies.map((frequency) => <Link href={`/frequencies/${frequency.id}`} key={frequency.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-mono text-[12px] text-zinc-500 transition hover:bg-white/[.025] hover:text-zinc-300"><span className="h-2 w-2 rounded-full bg-violet-400/70" /><span className="truncate">{frequency.name}</span></Link>)}
          {!summary.frequencies.length && <Link href="/frequencies/new" className="block rounded-lg border border-dashed border-white/[.07] px-3 py-3 font-mono text-[9px] text-zinc-600">Create your first frequency</Link>}
        </div>
      </div>
      <div className="mx-7 mb-7 flex items-center gap-3 border-t border-white/[.06] pt-7"><Link href={`/profile/${username}`} className="flex min-w-0 flex-1 items-center gap-3">{summary.profile?.avatarUrl ? <img src={summary.profile.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-md border border-white/10 object-cover"/> : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[.035]"><CircleUserRound className="h-5 w-5 text-zinc-500" /></span>}<span className="min-w-0"><span className="block truncate font-mono text-xs text-zinc-200">{name}</span><span className="mt-1 block truncate font-mono text-[8px] text-zinc-600">@{username}</span><span className="mt-1 flex"><StrengthBars value={summary.profile?.strength || 0}/></span></span></Link><Link href="/settings" aria-label="Settings" className="rounded-md p-2 text-zinc-600 hover:bg-white/5 hover:text-zinc-300"><Settings className="h-4 w-4"/></Link></div>
    </aside>
  );
}
