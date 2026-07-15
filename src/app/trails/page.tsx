import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Lock, Plus, Share2 } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeading } from "@/components/page-heading";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function TrailsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const trails = await db.researchTrail.findMany({
    where: { ownerId: session.user.id, isArchived: false },
    orderBy: { updatedAt: "desc" },
  });

  return <AppLayout><PageHeading eyebrow="Research trails" title="Connect what you notice" description="Trails turn isolated signals into a path you can revisit and share." action={<Link href="/trails/new/edit" className="rounded-lg bg-violet-400/[.12] px-4 py-3 font-mono text-[10px] text-violet-300"><Plus className="mr-2 inline h-3.5 w-3.5"/>New trail</Link>}/>{trails.length ? <div className="grid gap-4 sm:grid-cols-2">{trails.map((trail) => <Link href={`/trails/${trail.id}/edit`} key={trail.id} className="group rounded-xl border border-white/[.07] bg-white/[.015] p-6 hover:border-white/[.12]"><div className="mb-8 flex items-center gap-2">{trail.nodeCount ? Array.from({length:Math.min(trail.nodeCount,6)}).map((_,i)=><span key={i} className="flex items-center"><i className={`h-2 w-2 rounded-full ${i===0?"bg-violet-400":"bg-zinc-700"}`}/>{i<Math.min(trail.nodeCount,6)-1&&<i className="h-px w-5 bg-zinc-800"/>}</span>) : <span className="font-mono text-[9px] text-zinc-700">EMPTY TRAIL · READY TO EDIT</span>}</div><h2 className="font-mono text-sm text-zinc-200">{trail.title}</h2><p className="mt-3 font-mono text-[10px] leading-5 text-zinc-600">{trail.description}</p><p className="mt-5 flex items-center gap-2 font-mono text-[9px] text-zinc-700">{trail.visibility === "PRIVATE"?<Lock className="h-3 w-3"/>:<Share2 className="h-3 w-3"/>}{trail.visibility.toLowerCase()} · {trail.nodeCount} nodes<ArrowRight className="ml-auto h-3.5 w-3.5 transition group-hover:translate-x-1"/></p></Link>)}</div> : <div className="rounded-xl border border-dashed border-white/10 px-6 py-20 text-center"><p className="font-mono text-sm text-zinc-300">No trails yet</p><Link href="/trails/new/edit" className="mt-4 inline-flex items-center gap-2 font-mono text-xs text-violet-300"><Plus className="h-3.5 w-3.5"/>Create your first trail</Link></div>}</AppLayout>;
}
