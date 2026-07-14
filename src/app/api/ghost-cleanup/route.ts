import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function POST(request:Request){const secret=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");if(!process.env.CRON_SECRET||secret!==process.env.CRON_SECRET)return NextResponse.json({error:"Unauthorized"},{status:401});const now=new Date();const result=await db.signal.updateMany({where:{isDeleted:false,OR:[{ghostModeExpiresAt:{lte:now}},{ghostMode:"OPEN_ONCE",ghostModeOpenedAt:{not:null}}]},data:{isDeleted:true,deletedAt:now}});return NextResponse.json({expired:result.count})}
