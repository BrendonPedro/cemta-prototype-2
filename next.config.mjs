// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      // Add Yelp CDN domains
      {
        protocol: 'https',
        hostname: 's3-media1.fl.yelpcdn.com',
      },
      {
        protocol: 'https',
        hostname: 's3-media2.fl.yelpcdn.com',
      },
      {
        protocol: 'https',
        hostname: 's3-media3.fl.yelpcdn.com',
      },
      {
        protocol: 'https',
        hostname: 's3-media4.fl.yelpcdn.com',
      },
      {
        protocol: 'https',
        hostname: 's3-media5.fl.yelpcdn.com',
      },
      {
        protocol: 'https',
        hostname: 's3.amazonaws.com',
      },
    ],
  },
};

export default nextConfig;