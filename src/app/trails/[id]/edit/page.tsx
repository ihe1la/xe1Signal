import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TrailCanvas } from "@/components/trail-canvas";

export default async function TrailEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  if (!session?.user?.id) redirect("/login");
  if (id !== "new") {
    const trail = await db.researchTrail.findUnique({ where: { id }, select: { ownerId: true } });
    if (!trail || trail.ownerId !== session.user.id) notFound();
  }
  return <TrailCanvas id={id} editable />;
}
