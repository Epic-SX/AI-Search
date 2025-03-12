/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Add this to suppress hydration warnings
  compiler: {
    // Enables the styled-components SWC transform
    styledComponents: true,
    // Suppress hydration warnings
    emotion: {
      // The default should be true
      sourceMap: true,
      // This should be true if you want to use `@emotion/babel-plugin` for automatic label
      autoLabel: 'dev-only',
      // This should be true if you want to support IE11
      cssPropOptimization: true,
    },
  },
  // Add image configuration to allow Amazon domains
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
      // Add Rakuten domains
      'thumbnail.image.rakuten.co.jp',
      'shop.r10s.jp',
      'tshop.r10s.jp',
      'r.r10s.jp',
      'www.rakuten.co.jp',
      'rakuten.co.jp',
      'image.rakuten.co.jp'
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
      // Add Rakuten domains
      {
        protocol: 'https',
        hostname: '**.rakuten.co.jp',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '**.r10s.jp',
        pathname: '**',
      }
    ],
    // Allow unoptimized images from external domains
    unoptimized: true,
    // Increase the image size limit
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Add security headers to allow loading images from external domains
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              img-src 'self' data: https://*.amazon.com https://*.amazon.co.jp https://*.ssl-images-amazon.com 
                https://*.media-amazon.com https://*.amazon-adsystem.com https://placehold.co
                https://*.rakuten.co.jp https://*.r10s.jp;
              font-src 'self' data:;
              style-src 'self' 'unsafe-inline';
              script-src 'self' 'unsafe-eval' 'unsafe-inline';
              connect-src 'self' https://api.example.com;
            `.replace(/\s+/g, ' ').trim(),
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig 