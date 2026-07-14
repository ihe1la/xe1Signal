import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
export async function GET(){const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});const notifications=await db.notification.findMany({where:{userId:session.user.id},orderBy:{createdAt:"desc"},take:50});return NextResponse.json({notifications})}
export async function PATCH(request:Request){const session=await auth();if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});const {id}=await request.json().catch(()=>({}));await db.notification.updateMany({where:{userId:session.user.id,...(id?{id}:{})},data:{isRead:true,readAt:new Date()}});return NextResponse.json({success:true})}
