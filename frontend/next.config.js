/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: http:; font-src 'self'; connect-src 'self' http://localhost:5000 " + (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + ";"
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig 