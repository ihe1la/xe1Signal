'use client';

import { useEffect, useState } from 'react';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallAppButton() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIos(ios && !standalone);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!prompt && !isIos) return null;

  const install = async () => {
    if (prompt) {
      await prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
      return;
    }
    setShowIosHelp(true);
  };

  return (
    <div className="mt-4 text-center">
      <button
        type="button"
        onClick={install}
        className="font-mono text-[9px] uppercase tracking-[.18em] text-zinc-500 transition hover:text-violet-300"
      >
        Install mobile app ↓
      </button>
      {showIosHelp && (
        <p className="mt-2 font-mono text-[9px] text-zinc-400">
          In Safari, tap Share, then “Add to Home Screen.”
        </p>
      )}
    </div>
  );
}
