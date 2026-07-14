import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { FrequencyDetail } from "@/components/frequency-detail";
import { findFrequency } from "@/lib/demo-data";

export default async function FrequencyPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  const frequency = findFrequency(id);
  if (!frequency) notFound();
  const record = await db.frequency.findUnique({ where: { id }, select: { ownerId: true } });
  return <FrequencyDetail frequency={frequency} canEdit={record?.ownerId === session?.user?.id} />;
}
