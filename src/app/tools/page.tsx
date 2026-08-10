import type { Metadata } from "next";
import { AppLayout } from "@/components/layout/app-layout";
import { RemoteAppFrame } from "@/components/remote-app-frame";

export const metadata: Metadata = { title: "Tools" };

export default function ToolsPage() {
  return (
    <AppLayout showRightSidebar={false}>
      <RemoteAppFrame title="Tools" url="https://l30on.top/dashboard/" />
    </AppLayout>
  );
}
