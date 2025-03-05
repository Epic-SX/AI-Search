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
}

module.exports = nextConfig 