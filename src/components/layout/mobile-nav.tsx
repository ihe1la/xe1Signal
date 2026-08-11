"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Compass, Grid2X2, Headphones, Timer, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const items = [["/discover", Compass, "Discover"], ["/archive", BookOpen, "Library"], ["/vibe", Headphones, "Vibe"], ["/study", Timer, "Study"], ["/tools", Grid2X2, "Tools"], ["/people", Users, "People"]] as const;
  return <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[68px] items-center justify-around overflow-x-auto border-t border-white/[.07] bg-[#0a0b10]/95 px-2 backdrop-blur-xl lg:hidden">{items.map(([href, Icon, label]) => <Link key={href} href={href} className={cn("flex min-w-14 flex-col items-center gap-1.5 text-[9px] text-zinc-600", (pathname === href || pathname.startsWith(`${href}/`)) && "text-violet-300")}><Icon className="h-5 w-5" /><span>{label}</span></Link>)}</nav>;
}
