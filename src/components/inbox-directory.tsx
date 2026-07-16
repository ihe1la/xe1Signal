"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";

export type InboxPerson = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  latest: { content: string; createdAt: string } | null;
  unread: boolean;
};

export function InboxDirectory({ users }: { users: InboxPerson[] }) {
  const [query, setQuery] = React.useState("");
  const needle = query.trim().toLowerCase();
  const visible = users.filter((user) => `${user.name} ${user.username}`.toLowerCase().includes(needle));

  return <>
    <div className="relative mb-5"><Search className="absolute left-3 top-3 h-4 w-4 text-zinc-600"/><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-lg border border-white/[.07] bg-white/[.02] pl-10 font-mono text-xs outline-none" placeholder="Search @username to start a message..."/></div>
    <div className="overflow-hidden rounded-xl border border-white/[.07]">{visible.map((user) => <Link key={user.id} href={`/inbox/${user.username}`} className="flex items-center gap-4 border-b border-white/[.055] p-4 last:border-0 hover:bg-white/[.02]"><img src={user.avatarUrl || `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(user.username)}&backgroundColor=111116`} alt="" className="h-10 w-10 rounded-full bg-zinc-900 grayscale"/><div className="min-w-0 flex-1"><p className="truncate font-mono text-xs text-zinc-300">{user.name} <span className="text-[9px] text-zinc-600">@{user.username}</span></p><p className="mt-1 truncate font-mono text-[10px] text-zinc-600">{user.latest?.content || "Start a private conversation"}</p></div>{user.latest && <span className="font-mono text-[9px] text-zinc-700">{new Date(user.latest.createdAt).toLocaleDateString()}</span>}{user.unread && <i className="h-1.5 w-1.5 rounded-full bg-violet-400"/>}</Link>)}{!visible.length && <p className="px-5 py-16 text-center font-mono text-[10px] text-zinc-600">No user matches that username.</p>}</div>
  </>;
}
