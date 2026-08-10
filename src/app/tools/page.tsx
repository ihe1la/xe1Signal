import type { Metadata } from "next";
import { AppLayout } from "@/components/layout/app-layout";

export const metadata: Metadata = { title: "Tools" };

export default function ToolsPage() {
  return (
    <AppLayout showRightSidebar={false}>
      <div className="mx-auto max-w-[1300px]">
        <h1 className="font-sans text-3xl font-semibold tracking-tight text-zinc-100 sm:text-[34px]">Tools</h1>
      </div>
    </AppLayout>
  );
}
