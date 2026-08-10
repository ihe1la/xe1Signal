import type { Metadata } from "next";
import { AppLayout } from "@/components/layout/app-layout";
import { ToolsWorkspace } from "@/components/tools-workspace";

export const metadata: Metadata = { title: "Tools" };

export default function ToolsPage() {
  return (
    <AppLayout showRightSidebar={false}>
      <div className="mx-auto max-w-[1300px]">
        <h1 className="font-sans text-3xl font-semibold tracking-tight text-zinc-100 sm:text-[34px]">Tools</h1>
        <p className="mt-2 max-w-2xl font-sans text-sm text-zinc-500">Local XMind-style sheet for mindmapping targets and notes.</p>
        <div className="mt-8">
          <ToolsWorkspace />
        </div>
      </div>
    </AppLayout>
  );
}
