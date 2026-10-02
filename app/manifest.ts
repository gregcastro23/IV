import type { MetadataRoute } from 'next'

// Installing to the home screen opens Fourth Step in its own window. The name and icon are deliberately
// discreet. There is no service worker: every launch loads the current release, as the website does.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'IV · Fourth Step', short_name: 'IV', description: 'Private check-ins and a guided Fourth Step inventory, encrypted on your device.',
    id: '/', start_url: '/', scope: '/', display: 'standalone', orientation: 'portrait',
    background_color: '#f9f6ef', theme_color: '#f9f6ef',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
