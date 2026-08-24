'use client';

import { useEffect, useState } from 'react';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function InstallAppButton() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    const ua = navigator.userAgent;
    setIsIos(/iphone|ipad|ipod/i.test(ua));
    setIsAndroid(/android/i.test(ua));

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setPrompt(null);
      setShowHelp(false);
    });

    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (installed) return null;

  const install = async () => {
    if (prompt) {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') setPrompt(null);
      return;
    }
    setShowHelp(true);
  };

  // Always offer install on phones; desktop Chrome still gets the native prompt when available.
  const canShow = Boolean(prompt || isIos || isAndroid);
  if (!canShow) return null;

  return (
    <div className="mt-4 text-center">
      <button
        type="button"
        onClick={install}
        className="font-mono text-[9px] uppercase tracking-[.18em] text-zinc-500 transition hover:text-violet-300"
      >
        {prompt ? 'Install app ↓' : 'Add to home screen ↓'}
      </button>
      {showHelp && isIos ? (
        <p className="mt-2 font-mono text-[9px] leading-5 text-zinc-400">
          Safari → Share → Add to Home Screen
        </p>
      ) : null}
      {showHelp && isAndroid && !prompt ? (
        <p className="mt-2 font-mono text-[9px] leading-5 text-zinc-400">
          Chrome → ⋮ menu → Install app
          <br />
          (or Add to Home screen)
        </p>
      ) : null}
    </div>
  );
}
