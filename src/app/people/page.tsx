"use client";

import * as React from "react";
import Link from "next/link";
import { Check, MessageCircle, Search, UserPlus } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeading } from "@/components/page-heading";

type Person = {
  id: string;
  username: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  followerCount: number;
  signalCount: number;
  frequencyCount: number;
  isFollowing: boolean;
  isSelf: boolean;
};

export default function PeoplePage() {
  const [query, setQuery] = React.useState("");
  const [users, setUsers] = React.useState<Person[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/users?limit=500&q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : Promise.reject())
        .then((data) => setUsers(Array.isArray(data.users) ? data.users : []))
        .catch(() => { if (!controller.signal.aborted) setUsers([]); })
        .finally(() => { if (!controller.signal.aborted) setReady(true); });
    }, query ? 220 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  async function toggleFollow(person: Person) {
    const response = await fetch(`/api/users/${encodeURIComponent(person.username)}/follow`, { method: "POST" });
    if (!response.ok) return;
    const result = await response.json();
    setUsers((items) => items.map((item) => item.id === person.id ? { ...item, isFollowing: result.following, followerCount: result.followerCount } : item));
  }

  return <AppLayout>
    <PageHeading eyebrow="People" title="Everyone in the archive" description="Find every collector, visit their profile, or start a private conversation." />
    <div className="relative mb-6"><Search className="absolute left-3 top-3 h-4 w-4 text-zinc-600"/><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-lg border border-white/[.07] bg-white/[.02] pl-10 font-mono text-xs outline-none" placeholder="Search by name or @username..."/></div>
    {!ready ? <div className="h-48 animate-pulse rounded-xl border border-white/[.05] bg-white/[.02]"/> : users.length ? <div className="grid gap-4 sm:grid-cols-2">{users.map((user) => <article key={user.id} className="rounded-xl border border-white/[.07] bg-white/[.015] p-5"><div className="flex gap-4"><Link href={`/profile/${user.username}`}><img src={user.avatarUrl || `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(user.username)}&backgroundColor=111116`} alt="" className="h-14 w-14 rounded-full border border-white/10 bg-zinc-900 grayscale"/></Link><div className="min-w-0 flex-1"><Link href={`/profile/${user.username}`} className="block truncate font-mono text-sm text-zinc-200">{user.name}</Link><p className="mt-1 truncate font-mono text-[9px] text-zinc-600">@{user.username}{user.isSelf ? " · you" : ""}</p><p className="mt-2 line-clamp-2 font-mono text-[10px] leading-5 text-zinc-600">{user.bio || "A quiet corner of the archive."}</p></div></div><p className="mt-4 font-mono text-[9px] text-zinc-700">{user.signalCount} signals · {user.frequencyCount} frequencies · {user.followerCount} followers</p><div className="mt-4 flex gap-2">{user.isSelf ? <Link href={`/profile/${user.username}`} className="flex h-9 flex-1 items-center justify-center rounded-lg border border-white/[.07] font-mono text-[10px] text-zinc-400">View your profile</Link> : <><button onClick={() => toggleFollow(user)} className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-violet-400/[.1] font-mono text-[10px] text-violet-300">{user.isFollowing ? <Check className="h-3.5 w-3.5"/> : <UserPlus className="h-3.5 w-3.5"/>}{user.isFollowing ? "Following" : "Follow"}</button><Link href={`/inbox/${user.username}`} className="flex h-9 items-center justify-center gap-2 rounded-lg border border-white/[.07] px-3 font-mono text-[9px] text-zinc-400"><MessageCircle className="h-3.5 w-3.5"/>Message</Link></>}</div></article>)}</div> : <div className="rounded-xl border border-dashed border-white/10 py-20 text-center font-mono text-xs text-zinc-600">No people match that search.</div>}
  </AppLayout>;
}
