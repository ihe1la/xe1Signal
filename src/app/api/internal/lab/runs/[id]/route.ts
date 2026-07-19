import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isSameOrigin, requireScenarioLab } from "@/lib/scenario-lab-server";
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) { const session = await requireScenarioLab(); if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 }); if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 }); const { id } = await params; const deleted = await db.labRun.deleteMany({ where: { id, createdById: session.user.id } }); return deleted.count ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Not found" }, { status: 404 }); }
