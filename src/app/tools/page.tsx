import type { Metadata } from "next";
import { AppLayout } from "@/components/layout/app-layout";
import { RemoteAppFrame } from "@/components/remote-app-frame";

export const metadata: Metadata = { title: "Tools" };

export default function ToolsPage() {
  return (
    <AppLayout showRightSidebar={false}>
      <RemoteAppFrame title="Tools" url="https://pinqued.top/recon" remoteLabel="pinqued workspace" showOriginalLink={false} />
    </AppLayout>
  );
}
