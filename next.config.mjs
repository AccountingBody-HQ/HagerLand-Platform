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

const nextConfig = {
  // Test builds (scripts/with-test-env.sh) use a separate folder so they never mix with real builds.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/**' }],
  },
  experimental: {
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
