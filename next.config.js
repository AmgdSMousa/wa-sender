/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['whatsapp-web.js', 'puppeteer'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('whatsapp-web.js');
    }
    return config;
  },
};

module.exports = nextConfig;
