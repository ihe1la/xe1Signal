import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { FrequencyForm } from "@/components/frequency-form";

export default async function EditFrequencyPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  if (!session?.user?.id) redirect("/login");
  const frequency = await db.frequency.findUnique({ where: { id }, select: { ownerId: true } });
  if (!frequency || frequency.ownerId !== session.user.id) notFound();
  return <FrequencyForm id={id} />;
}
