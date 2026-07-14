export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <header className="mb-8 flex items-end justify-between gap-5"><div><p className="mb-3 font-mono text-[10px] uppercase tracking-[.17em] text-violet-400">{eyebrow}</p><h1 className="font-mono text-2xl tracking-tight text-zinc-100 sm:text-[30px]">{title}</h1>{description && <p className="mt-2 max-w-2xl font-mono text-[11px] leading-5 text-zinc-500">{description}</p>}</div>{action}</header>;
}
