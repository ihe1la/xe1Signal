"use client";

export function RelayWorkspace() {
  return (
    <div aria-label="Relay section" className="relative -m-3 min-h-[720px] overflow-hidden bg-[#09090c] sm:-m-5">
      <iframe
        title="Pinqued Relay"
        src="https://01x.site/relay"
        allow="clipboard-read; clipboard-write"
        className="absolute inset-y-0 left-[-228px] h-[760px] w-[calc(100%+228px)] min-w-[1120px] border-0 bg-[#09090c]"
      />
    </div>
  );
}
