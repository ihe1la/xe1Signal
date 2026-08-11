import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { ToolsWorkspace } from "@/components/tools-workspace";
import { canAccessOwnerTools } from "@/lib/owner-access";

export const metadata: Metadata = { title: "Tools" };

export default async function ToolsPage() {
  const session = await auth();
  if (!canAccessOwnerTools(session?.user?.username)) notFound();

  return (
    <AppLayout showRightSidebar={false}>
      <ToolsWorkspace />
    </AppLayout>
  );
}
