import { notFound, redirect } from "next/navigation";
import { Conversation } from "@/components/conversation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
export default async function ConversationPage({params}:{params:Promise<{username:string}>}){const session=await auth();if(!session?.user?.id)redirect("/login");const {username}=await params;const user=await db.user.findFirst({where:{username,isActive:true,isBanned:false,id:{not:session.user.id}},select:{id:true,username:true,name:true,displayName:true,avatarUrl:true}});if(!user)notFound();return <Conversation user={{id:user.id,username:user.username,name:user.displayName||user.name||user.username,avatarUrl:user.avatarUrl}}/>}
