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
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: http:; font-src 'self'; connect-src 'self' http://localhost:5000 " + (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + ";"
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-Requested-With, Content-Type, Accept',
          }
        ]
      }
    ]
  },
  images: {
    domains: [
      'images-fe.ssl-images-amazon.com',
      'images-na.ssl-images-amazon.com',
      'm.media-amazon.com',
      'images-amazon.com',
      'amazon.co.jp',
      'amazon.com',
      'placehold.co',
      'ws-na.amazon-adsystem.com',
      'ws-eu.amazon-adsystem.com',
      'ecx.images-amazon.com',
      'g-ec2.images-amazon.com',
      // Rakuten domains
      'thumbnail.image.rakuten.co.jp',
      'shop.r10s.jp',
      'tshop.r10s.jp',
      'r.r10s.jp',
      'www.rakuten.co.jp',
      'rakuten.co.jp',
      'image.rakuten.co.jp',
      'rms.rakuten.co.jp',
      'item.rakuten.co.jp',
      'hbb.afl.rakuten.co.jp',
      'static.affiliate.rakuten.co.jp'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazon.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '**.amazon.co.jp',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '**.ssl-images-amazon.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '**.media-amazon.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '**.amazon-adsystem.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '**.rakuten.co.jp',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '**.r10s.jp',
        pathname: '**',
      },
      {
        protocol: 'http',
        hostname: '**.rakuten.co.jp',
        pathname: '**',
      },
      {
        protocol: 'http',
        hostname: '**.r10s.jp',
        pathname: '**',
      }
    ],
    unoptimized: true,
  }
}

module.exports = nextConfig 