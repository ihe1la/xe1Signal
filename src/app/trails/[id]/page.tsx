import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TrailCanvas } from "@/components/trail-canvas";

export default async function TrailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  const trail = await db.researchTrail.findUnique({ where: { id }, select: { ownerId: true, visibility: true } });
  if (!trail || (trail.visibility === "PRIVATE" && trail.ownerId !== session?.user?.id)) notFound();
  return <TrailCanvas id={id} canEdit={trail.ownerId === session?.user?.id} />;
}
