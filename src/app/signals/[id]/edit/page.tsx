import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SignalComposer } from "@/components/signal-composer";

export default async function EditSignalPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  if (!session?.user?.id) redirect("/login");
  const signal = await db.signal.findUnique({ where: { id }, select: { ownerId: true } });
  if (!signal || signal.ownerId !== session.user.id) notFound();
  return <SignalComposer signalId={id} />;
}
