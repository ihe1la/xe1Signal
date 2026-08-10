import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppLayout } from "@/components/layout/app-layout";
import { VibeRoom } from "@/components/vibe-room";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Vibe",
  description: "A shared room for listening together.",
};

export default async function VibePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <AppLayout showRightSidebar={false}><VibeRoom /></AppLayout>;
}
