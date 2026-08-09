import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppLayout } from "@/components/layout/app-layout";
import { PartyRoom } from "@/components/party-room";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Party",
  description: "A shared room for listening together.",
};

export default async function PartyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <AppLayout showRightSidebar={false}><PartyRoom /></AppLayout>;
}
