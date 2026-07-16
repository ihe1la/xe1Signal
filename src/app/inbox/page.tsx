import { redirect } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { InboxDirectory } from "@/components/inbox-directory";
import { PageHeading } from "@/components/page-heading";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function InboxPage(){
  const session=await auth();
  if(!session?.user?.id)redirect("/login");
  const users=await db.user.findMany({where:{id:{not:session.user.id},isActive:true,isBanned:false},orderBy:[{lastActiveAt:"desc"},{createdAt:"desc"}],select:{id:true,username:true,name:true,displayName:true,avatarUrl:true,sentMessages:{where:{receiverId:session.user.id},orderBy:{createdAt:"desc"},take:1,select:{content:true,createdAt:true,isRead:true}},receivedMessages:{where:{senderId:session.user.id},orderBy:{createdAt:"desc"},take:1,select:{content:true,createdAt:true}}}});
  const directory=users.map((user)=>{const incoming=user.sentMessages[0];const outgoing=user.receivedMessages[0];const latest=!outgoing||(incoming&&incoming.createdAt>outgoing.createdAt)?incoming:outgoing;return{id:user.id,username:user.username,name:user.displayName||user.name||user.username,avatarUrl:user.avatarUrl,latest:latest?{content:latest.content,createdAt:latest.createdAt.toISOString()}:null,unread:Boolean(incoming&&!incoming.isRead)}});
  return <AppLayout><PageHeading eyebrow="Inbox" title="Quiet conversations" description="Search any username and start a private conversation."/><InboxDirectory users={directory}/></AppLayout>
}
