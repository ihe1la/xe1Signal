"use client";

import * as React from "react";
import { Header } from "./header";
import { LeftSidebar } from "./left-sidebar";
import { RightSidebar } from "./right-sidebar";
import { MobileNav } from "./mobile-nav";
import { cn } from "@/lib/utils";

export function AppLayout({ children, showRightSidebar = true, showLeftSidebar = true, className }: { children: React.ReactNode; showRightSidebar?: boolean; showLeftSidebar?: boolean; className?: string }) {
  return (
    <div className={cn("min-h-screen bg-[#08090d] text-[#e9e8ec]", className)}>
      {showLeftSidebar && <LeftSidebar />}
      <div className={cn("min-h-screen", showLeftSidebar && "lg:pl-[272px]")}>
        <Header reserveRightSidebar={showRightSidebar} />
        <div className={cn("mx-auto flex max-w-[1536px]", showRightSidebar && "2xl:pr-[304px]")}>
          <main className="min-w-0 flex-1 px-4 pb-24 pt-7 sm:px-7 lg:px-11 lg:pb-12 lg:pt-8">{children}</main>
        </div>
        {showRightSidebar && <RightSidebar />}
      </div>
      <MobileNav />
    </div>
  );
}
