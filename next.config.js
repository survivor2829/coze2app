/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.coze.site",
      },
      {
        protocol: "https",
        hostname: "**.coze.cn",
      },
    ],
  },
};

module.exports = nextConfig;
