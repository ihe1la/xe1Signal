import { notFound } from "next/navigation";
import { Conversation } from "@/components/conversation";
import { demoUsers } from "@/lib/demo-data";
export default async function ConversationPage({params}:{params:Promise<{username:string}>}){const {username}=await params;const user=demoUsers.find(u=>u.username===username);if(!user)notFound();return <Conversation user={user}/>}
