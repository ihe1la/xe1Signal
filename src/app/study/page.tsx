import type { Metadata } from "next";
import { AppLayout } from "@/components/layout/app-layout";
import { RemoteAppFrame } from "@/components/remote-app-frame";

export const metadata: Metadata = { title: "Study" };

export default function StudyPage() {
  return (
    <AppLayout showRightSidebar={false}>
      <RemoteAppFrame title="Study" url="https://tracker.l30on.top/" />
    </AppLayout>
  );
}
