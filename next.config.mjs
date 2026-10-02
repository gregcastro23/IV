import { fileURLToPath } from 'node:url'

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: fileURLToPath(new URL('.', import.meta.url)),
  },
  async headers() {
    const dev = process.env.NODE_ENV === 'development'
    const policy = ["default-src 'self'", `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`, "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self'", dev ? "connect-src 'self' ws: wss:" : "connect-src 'none'", "manifest-src 'self'", "worker-src 'none'", "object-src 'none'", "frame-src 'none'", "frame-ancestors 'none'", "form-action 'none'", "base-uri 'self'"].join('; ')
    // Only device unlock (WebAuthn) and copying exports are needed; every other powerful feature is off.
    const permissions = ['camera=()', 'microphone=()', 'geolocation=()', 'payment=()', 'usb=()', 'serial=()', 'hid=()', 'display-capture=()', 'browsing-topics=()', 'publickey-credentials-get=(self)', 'publickey-credentials-create=(self)', 'clipboard-write=(self)'].join(', ')
    return [{ source: '/:path*', headers: [
      { key: 'Content-Security-Policy', value: policy },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: permissions },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
      { key: 'X-DNS-Prefetch-Control', value: 'off' },
    ] }]
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
