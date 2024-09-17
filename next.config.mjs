/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['maps.googleapis.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },

      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
  },
};

export default nextConfig;



// next.config.js
// module.exports = {
//   webpack: (config, options) => {
//     config.externals = {
//       ...config.externals,
//       '@google-cloud/vision': 'commonjs @google-cloud/vision',
//       '@google-cloud/translate': 'commonjs @google-cloud/translate',
//     };

//     return config;
//   },
// };
