import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'xe1Signal',
    short_name: 'xe1Signal',
    description: 'A private space for signals, songs, links, and fragments worth keeping.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#07080c',
    theme_color: '#07080c',
    orientation: 'portrait-primary',
    categories: ['lifestyle', 'music', 'productivity'],
    id: 'https://he1l.me/',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
