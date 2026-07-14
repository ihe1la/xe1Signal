'use client';

import * as React from 'react';
import { ThemeProvider } from 'next-themes';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { AudioPlayerProvider } from '@/components/audio-player-provider';
import { PlayerProvider } from '@/components/player/player-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <AudioPlayerProvider><PlayerProvider>{children}</PlayerProvider></AudioPlayerProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'hsl(240, 5%, 12%)',
              color: 'hsl(0, 0%, 90%)',
              border: '1px solid hsl(240, 5%, 20%)',
            },
          }}
        />
      </ThemeProvider>
    </SessionProvider>
  );
}
