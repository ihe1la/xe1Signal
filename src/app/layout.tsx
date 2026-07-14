import { type Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Providers } from '@/components/providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: {
    default: process.env.NEXT_PUBLIC_APP_NAME || 'Signal Archive',
    template: `%s | ${process.env.NEXT_PUBLIC_APP_NAME || 'Signal Archive'}`,
  },
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
    'Save meaningful things from the internet. Organize them into collections called Frequencies.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: process.env.NEXT_PUBLIC_APP_NAME || 'Signal Archive',
    description:
      process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
      'Save meaningful things from the internet. Organize them into collections called Frequencies.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: process.env.NEXT_PUBLIC_APP_NAME || 'Signal Archive',
    description:
      process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
      'Save meaningful things from the internet. Organize them into collections called Frequencies.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans text-foreground antialiased',
          inter.variable,
          jetbrainsMono.variable
        )}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
