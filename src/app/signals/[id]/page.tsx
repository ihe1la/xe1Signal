import { notFound } from "next/navigation";
import { SignalDetail } from "@/components/signal-detail";
import { findSignal } from "@/lib/demo-data";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export default async function SignalPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  const record = await db.signal.findFirst({ where: { id, isDeleted: false }, include: { owner: { select: { id: true, username: true, name: true, avatarUrl: true } }, frequency: { select: { id: true, name: true } }, files: { orderBy: { createdAt: "asc" } } } });
  if (!record) {
    const demoSignal = findSignal(id);
    if (demoSignal) return <SignalDetail signal={demoSignal} canEdit={demoSignal.owner.id === session?.user?.id} />;
    notFound();
  }
  return <SignalDetail canEdit={record.ownerId === session?.user?.id} signal={{ id: record.id, type: record.type as "NOTE", title: record.title || "Untitled signal", description: record.description || undefined, content: record.content || undefined, sourceUrl: record.sourceUrl || undefined, sourceDomain: record.sourceDomain || undefined, previewImageUrl: record.previewImageUrl || undefined, tags: record.tags.split(",").filter(Boolean), visibility: record.visibility as "PUBLIC", signalStrength: record.signalStrength, reactionCount: record.reactionCount, commentCount: record.commentCount, saveCount: record.saveCount, viewCount: record.viewCount, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(), owner: { id: record.owner.id, username: record.owner.username, name: record.owner.name || record.owner.username, avatarUrl: record.owner.avatarUrl || "", bio: "", strength: 0 }, frequency: record.frequency || undefined, files: record.files }} />;
}
