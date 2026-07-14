import Link from "next/link";
import { redirect } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeading } from "@/components/page-heading";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function InboxPage(){
  const session=await auth();
  if(!session?.user?.id)redirect("/login");
  const users=await db.user.findMany({where:{id:{not:session.user.id},isActive:true},select:{id:true,username:true,avatarUrl:true,sentMessages:{where:{receiverId:session.user.id},orderBy:{createdAt:"desc"},take:1,select:{content:true,createdAt:true,isRead:true}},receivedMessages:{where:{senderId:session.user.id},orderBy:{createdAt:"desc"},take:1,select:{content:true,createdAt:true}}}});
  return <AppLayout><PageHeading eyebrow="Inbox" title="Quiet conversations" description="Private messages with the other people in your archive."/><div className="overflow-hidden rounded-xl border border-white/[.07]">{users.map(user=>{const incoming=user.sentMessages[0];const outgoing=user.receivedMessages[0];const latest=!outgoing||incoming&&incoming.createdAt>outgoing.createdAt?incoming:outgoing;return <Link key={user.id} href={`/inbox/${user.username}`} className="flex items-center gap-4 border-b border-white/[.055] p-4 last:border-0 hover:bg-white/[.02]"><img src={user.avatarUrl||`https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${user.username}&backgroundColor=111116`} alt="" className="h-10 w-10 rounded-full bg-zinc-900 grayscale"/><div className="min-w-0 flex-1"><p className="font-mono text-xs text-zinc-300">{user.username}</p><p className="mt-1 truncate font-mono text-[10px] text-zinc-600">{latest?.content||"Start a private conversation"}</p></div>{latest&&<span className="font-mono text-[9px] text-zinc-700">{latest.createdAt.toLocaleDateString()}</span>}{incoming&&!incoming.isRead&&<i className="h-1.5 w-1.5 rounded-full bg-violet-400"/>}</Link>})}</div></AppLayout>
}
