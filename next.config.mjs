/** @type {import('next').NextConfig} */

const legacyToHome = ['diaspora', 'money', 'birrbank', 'jobs', 'cars', 'tutors', 'community', 'events']

const legacyRedirects = [
  ...['post', 'manage', 'edit-link'].map((p) => ({ source: `/property/${p}`, destination: '/list-with-us' })),
  { source: '/housing', destination: '/property' },
  { source: '/housing/:path*', destination: '/property' },
  { source: '/business', destination: '/professionals' },
  { source: '/business/:path*', destination: '/professionals' },
  { source: '/delivery', destination: '/professionals' },
  { source: '/delivery/:path*', destination: '/professionals' },
  { source: '/made-in-ethiopia', destination: '/supplies' },
  { source: '/made-in-ethiopia/:path*', destination: '/supplies' },
  ...legacyToHome.flatMap((s) => [
    { source: `/${s}`, destination: '/' },
    { source: `/${s}/:path*`, destination: '/' },
  ]),
  { source: '/edit-link', destination: '/login' },
].map((r) => ({ ...r, permanent: true }))

const supabaseHost = (() => {
  try {
    const u = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
    return { protocol: u.protocol.replace(':', ''), hostname: u.hostname, port: u.port }
  } catch {
    return { protocol: 'https', hostname: 'invalid.supabase.co', port: '' }
  }
})()

const nextConfig = {
  // Test builds (scripts/with-test-env.sh) use a separate folder so they never mix with real builds.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  images: {
    // WebP only: AVIF conversion is the subject of a Next.js 14 advisory (see docs/LAUNCH_REPORT.md).
    formats: ['image/webp'],
    // Only HagerLand's own public photo bucket can be resized (not any Supabase project).
    remotePatterns: [{ protocol: supabaseHost.protocol, hostname: supabaseHost.hostname, port: supabaseHost.port, pathname: '/storage/v1/object/public/public-media/**' }],
  },
  experimental: {
    // instrumentation.ts checks the environment once at server start.
    instrumentationHook: true,
    // Share-image routes read the bundled Manrope font files at runtime.
    outputFileTracingIncludes: { '/og/**': ['./lib/fonts/**'] },
    serverActions: {
      bodySizeLimit: '4mb',
      allowedOrigins: [
        'localhost:3000',
        ...(process.env.NODE_ENV !== 'production' ? ['*.app.github.dev'] : []),
      ],
    },
  },
  async redirects() {
    return legacyRedirects
  },
}

export default nextConfig
