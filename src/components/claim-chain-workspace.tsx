"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Link2, Pencil, Search, Trash2 } from "lucide-react";
import {
  CLAIM_CHAIN_SIGNAL_DRAFT_KEY,
  CLAIM_CHAIN_STORAGE_KEY,
  buildSignalDraft,
  createClaimChain,
  parseClaimChains,
  searchClaimChains,
  serializeClaimChains,
  sortClaimChainsNewestFirst,
  updateClaimChain,
  type ClaimChain,
} from "@/lib/claim-chain";
import {
  FINDINGS_STORAGE_KEY,
  parseFindings,
  sortFindingsNewestFirst,
  type Finding,
} from "@/lib/findings";
import { cn } from "@/lib/utils";

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const emptyDraft = {
  claim: "",
  proof: "",
  impact: "",
  nextStep: "",
  findingId: null as string | null,
};

export function ClaimChainWorkspace() {
  const router = useRouter();
  const [chains, setChains] = React.useState<ClaimChain[]>([]);
  const [findings, setFindings] = React.useState<Finding[]>([]);
  const [hydrated, setHydrated] = React.useState(false);
  const [draft, setDraft] = React.useState(emptyDraft);
  const [query, setQuery] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const claimRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    setChains(sortClaimChainsNewestFirst(parseClaimChains(window.localStorage.getItem(CLAIM_CHAIN_STORAGE_KEY))));
    setFindings(sortFindingsNewestFirst(parseFindings(window.localStorage.getItem(FINDINGS_STORAGE_KEY))));
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CLAIM_CHAIN_STORAGE_KEY, serializeClaimChains(chains));
  }, [chains, hydrated]);

  const visible = React.useMemo(
    () => searchClaimChains(sortClaimChainsNewestFirst(chains), query),
    [chains, query],
  );

  function resetDraft() {
    setDraft(emptyDraft);
    setEditingId(null);
    claimRef.current?.focus();
  }

  function saveChain() {
    if (editingId) {
      setChains((current) =>
        current.map((item) => (item.id === editingId ? updateClaimChain(item, draft) : item)),
      );
      resetDraft();
      return;
    }
    const next = createClaimChain(draft);
    if (!next) return;
    setChains((current) => [next, ...current]);
    resetDraft();
  }

  function startEdit(chain: ClaimChain) {
    setEditingId(chain.id);
    setDraft({
      claim: chain.claim,
      proof: chain.proof,
      impact: chain.impact,
      nextStep: chain.nextStep,
      findingId: chain.findingId,
    });
    claimRef.current?.focus();
  }

  function removeChain(id: string) {
    setChains((current) => current.filter((item) => item.id !== id));
    if (editingId === id) resetDraft();
  }

  function pullFinding(findingId: string) {
    const finding = findings.find((item) => item.id === findingId);
    if (!finding) {
      setDraft((current) => ({ ...current, findingId: null }));
      return;
    }
    setDraft((current) => ({
      ...current,
      findingId: finding.id,
      claim: current.claim.trim() ? current.claim : finding.body,
      proof: current.proof.trim() ? current.proof : finding.body,
    }));
  }

  function draftSignal(chain: ClaimChain) {
    window.sessionStorage.setItem(CLAIM_CHAIN_SIGNAL_DRAFT_KEY, JSON.stringify(buildSignalDraft(chain)));
    router.push("/signals/new");
  }

  const canSave = Boolean(draft.claim.trim());

  return (
    <div aria-label="Claim Chain section" className="mx-auto max-w-[860px]">
      <p className="mb-4 font-sans text-sm text-zinc-500">
        Turn a messy note into a short evidence spine: claim, proof, impact, next step. Draft a Signal when it is ready.
      </p>

      <section className="mb-6 rounded-2xl border border-violet-400/20 bg-[#0d0e14]/92 p-4 shadow-[0_18px_50px_rgba(0,0,0,.35)] backdrop-blur-md sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="font-sans text-[11px] uppercase tracking-[.14em] text-violet-300/80">
            {editingId ? "Edit chain" : "New chain"}
          </p>
          {editingId ? (
            <button type="button" onClick={resetDraft} className="font-sans text-xs text-zinc-500 hover:text-zinc-300">
              Cancel edit
            </button>
          ) : null}
        </div>

        {findings.length > 0 ? (
          <div className="mb-4">
            <label htmlFor="claim-finding" className="mb-1.5 block font-sans text-[11px] text-zinc-500">
              Pull from a Finding
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.02] px-3 py-2">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
              <select
                id="claim-finding"
                value={draft.findingId || ""}
                onChange={(event) => pullFinding(event.target.value)}
                className="w-full bg-transparent font-sans text-sm text-zinc-200 outline-none"
              >
                <option value="">No linked finding</option>
                {findings.slice(0, 40).map((finding) => (
                  <option key={finding.id} value={finding.id}>
                    {finding.body.slice(0, 80)}
                    {finding.body.length > 80 ? "…" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        <Field
          id="claim-claim"
          label="Claim"
          hint="What is true?"
          value={draft.claim}
          onChange={(claim) => setDraft((current) => ({ ...current, claim }))}
          rows={2}
          textareaRef={claimRef}
          placeholder="/users/{id} returns other accounts without ownership checks #idor"
        />
        <Field
          id="claim-proof"
          label="Proof"
          hint="What did you see?"
          value={draft.proof}
          onChange={(proof) => setDraft((current) => ({ ...current, proof }))}
          rows={3}
          placeholder="Authed as A, requested B’s id → 200 with B’s email"
        />
        <Field
          id="claim-impact"
          label="Impact"
          hint="Why it matters"
          value={draft.impact}
          onChange={(impact) => setDraft((current) => ({ ...current, impact }))}
          rows={2}
          placeholder="Any user can read any profile; PII exposure"
        />
        <Field
          id="claim-next"
          label="Next"
          hint="What to do now"
          value={draft.nextStep}
          onChange={(nextStep) => setDraft((current) => ({ ...current, nextStep }))}
          rows={2}
          placeholder="Map all object endpoints + write report draft"
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[.06] pt-4">
          <p className="font-sans text-[11px] text-zinc-600">Use #tags in any field · saved in this browser</p>
          <button
            type="button"
            onClick={saveChain}
            disabled={!canSave}
            className="inline-flex h-9 items-center rounded-lg border border-violet-400/35 bg-violet-500/20 px-4 text-xs font-medium text-violet-100 transition hover:border-violet-300/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {editingId ? "Update chain" : "Save chain"}
          </button>
        </div>
      </section>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.02] px-3 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-zinc-500" />
        <label htmlFor="claim-search" className="sr-only">
          Search claim chains
        </label>
        <input
          id="claim-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search claims, proof, #tags…"
          className="w-full bg-transparent font-sans text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
        />
        <span className="shrink-0 font-sans text-[11px] text-zinc-600">
          {visible.length}/{chains.length}
        </span>
      </div>

      {!hydrated ? (
        <p className="py-16 text-center font-sans text-sm text-zinc-600">Loading claim chains…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[.08] px-6 py-16 text-center">
          <p className="font-sans text-sm text-zinc-400">
            {chains.length === 0
              ? "No chains yet. Write the claim first, then fill proof and impact."
              : "No claim chains match that search."}
          </p>
          {findings.length === 0 ? (
            <p className="mt-2 font-sans text-[12px] text-zinc-600">
              Tip: capture notes in <Link href="/tools" className="text-violet-300/80 hover:text-violet-200">Findings</Link> first, then pull them here.
            </p>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Claim chains list">
          {visible.map((chain) => (
            <li key={chain.id} className="rounded-2xl border border-white/[.08] bg-white/[.02] p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <time className="font-sans text-[11px] text-zinc-600" dateTime={chain.updatedAt}>
                  {formatWhen(chain.updatedAt)}
                </time>
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label="Draft signal from claim chain"
                    onClick={() => draftSignal(chain)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-zinc-500 transition hover:bg-white/[.04] hover:text-violet-200"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    <span className="font-sans text-[11px]">Signal</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Edit claim chain"
                    onClick={() => startEdit(chain)}
                    className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-white/[.04] hover:text-zinc-200"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete claim chain"
                    onClick={() => removeChain(chain.id)}
                    className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-white/[.04] hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <SpineRow label="Claim" value={chain.claim} emphasis />
              {chain.proof ? <SpineRow label="Proof" value={chain.proof} /> : null}
              {chain.impact ? <SpineRow label="Impact" value={chain.impact} /> : null}
              {chain.nextStep ? <SpineRow label="Next" value={chain.nextStep} /> : null}

              {chain.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {chain.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setQuery(`#${tag}`)}
                      className="rounded-md border border-violet-400/15 bg-violet-500/10 px-2 py-0.5 font-sans text-[11px] text-violet-200/90 transition hover:border-violet-300/30"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  value,
  onChange,
  rows,
  placeholder,
  textareaRef,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  placeholder: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-sans text-[11px] uppercase tracking-[.12em] text-zinc-500">
          {label}
        </label>
        <span className="font-sans text-[10px] text-zinc-700">{hint}</span>
      </div>
      <textarea
        id={id}
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-y rounded-xl border border-white/[.08] bg-[#0a0b10] px-3 py-2.5 font-sans text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-violet-400/30"
      />
    </div>
  );
}

function SpineRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={cn("border-t border-white/[.05] py-2.5 first:border-t-0 first:pt-0", emphasis && "pt-0")}>
      <p className="mb-1 font-sans text-[10px] uppercase tracking-[.14em] text-violet-300/70">{label}</p>
      <p className={cn("whitespace-pre-wrap font-sans leading-6 text-zinc-300", emphasis ? "text-[15px] text-zinc-100" : "text-sm")}>
        {value}
      </p>
    </div>
  );
}
