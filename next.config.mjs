/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        ...(process.env.NODE_ENV !== 'production'
          ? ['*.app.github.dev']
          : []),
      ],
    },
  },
}
export default nextConfig
