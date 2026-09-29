/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Builds and boots with no network and no validator. Every chain read happens
  // at runtime in the browser (or in a `force-dynamic` route handler).
  webpack(config) {
    // `@solana/web3.js` reaches for these Node builtins on some code paths.
    // They are not needed in a browser bundle.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
