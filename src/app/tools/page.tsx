import type { Metadata } from "next";
import { AppLayout } from "@/components/layout/app-layout";
import { ToolsWorkspace } from "@/components/tools-workspace";

export const metadata: Metadata = { title: "Tools" };

export default function ToolsPage() {
  return (
    <AppLayout showRightSidebar={false}>
      <ToolsWorkspace />
    </AppLayout>
  );
}
