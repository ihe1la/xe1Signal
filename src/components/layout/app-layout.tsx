"use client";

import * as React from "react";
import { Header } from "./header";
import { LeftSidebar } from "./left-sidebar";
import dynamic from "next/dynamic";
import { MobileNav } from "./mobile-nav";
import { cn } from "@/lib/utils";

const RightSidebar = dynamic(() => import("./right-sidebar").then((module) => module.RightSidebar), { ssr: false });

export function AppLayout({ children, showRightSidebar = true, showLeftSidebar = true, className }: { children: React.ReactNode; showRightSidebar?: boolean; showLeftSidebar?: boolean; className?: string }) {
  const [sidebarVisible, setSidebarVisible] = React.useState(false);
  React.useEffect(() => {
    if (!showRightSidebar) return;
    const media = window.matchMedia("(min-width: 1536px)");
    const update = () => setSidebarVisible(media.matches);
    update();
    media.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
    };
  }, [showRightSidebar]);
  return (
    <div className={cn("min-h-screen bg-[#08090d] text-[#e9e8ec]", className)}>
      {showLeftSidebar && <LeftSidebar />}
      <div className={cn("min-h-screen", showLeftSidebar && "lg:pl-[272px]")}>
        <Header reserveRightSidebar={showRightSidebar} />
        <div className={cn("mx-auto flex max-w-[1536px]", showRightSidebar && "2xl:pr-[364px]")}>
          <main className="min-w-0 flex-1 px-4 pb-24 pt-7 sm:px-7 lg:px-11 lg:pb-12 lg:pt-8">{children}</main>
        </div>
        {showRightSidebar && sidebarVisible && <RightSidebar />}
      </div>
      <MobileNav />
    </div>
  );
}
