"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";

type ConversationUser = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
};

type Message = {
  id: string;
  content: string;
  createdAt: string;
  sender: { username: string };
};

export function Conversation({ user }: { user: ConversationUser }) {
  const [text, setText] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState("");
  const avatarUrl = user.avatarUrl || `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(user.username)}`;

  React.useEffect(() => {
    let active = true;
    fetch(`/api/messages?username=${encodeURIComponent(user.username)}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        if (active) {
          setMessages((current) => [
            ...(data.messages || []),
            ...current.filter((message) => !(data.messages || []).some((saved: Message) => saved.id === message.id)),
          ]);
        }
      })
      .catch(() => {
        if (active) setError("Could not load this conversation.");
      });
    return () => { active = false; };
  }, [user.username]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setError("");
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: user.username, content }),
    });
    if (response.ok) {
      const data = await response.json();
      setMessages((list) => [...list, { ...data.message, sender: { username: "me" } }]);
      setText("");
    } else {
      setError("Message could not be sent.");
    }
    setSending(false);
  }

  return <AppLayout showRightSidebar={false}>
    <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-white/[.07]">
      <header className="flex h-16 items-center gap-4 border-b border-white/[.06] px-4">
        <Link href="/inbox" aria-label="Back to inbox"><ArrowLeft className="h-4 w-4 text-zinc-500" /></Link>
        <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full bg-zinc-900 object-cover grayscale" />
        <div>
          <p className="font-mono text-xs">{user.name}</p>
          <p className="font-mono text-[9px] text-zinc-600">@{user.username} · private conversation</p>
        </div>
      </header>
      <div className="min-h-[55vh] space-y-5 p-5">
        {!messages.length && !error && <p className="py-16 text-center font-mono text-[10px] text-zinc-600">No messages yet. Start the conversation.</p>}
        {messages.map((message) => {
          const mine = message.sender.username !== user.username;
          return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-xl px-4 py-3 font-mono text-[11px] leading-5 ${mine ? "bg-violet-400/[.12] text-zinc-200" : "bg-white/[.04] text-zinc-400"}`}>
              {message.content}<span className="ml-3 text-[8px] text-zinc-600">{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>;
        })}
      </div>
      {error && <p className="px-4 pb-2 font-mono text-[10px] text-red-300">{error}</p>}
      <form onSubmit={send} className="flex gap-2 border-t border-white/[.06] p-4">
        <input value={text} onChange={(event) => setText(event.target.value)} className="h-11 flex-1 rounded-lg border border-white/[.07] bg-[#090a0e] px-3 font-mono text-xs outline-none" placeholder="Write a message..." />
        <button disabled={sending || !text.trim()} aria-label="Send message" className="grid h-11 w-11 place-items-center rounded-lg bg-violet-400/[.12] text-violet-300 disabled:opacity-40"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  </AppLayout>;
}
