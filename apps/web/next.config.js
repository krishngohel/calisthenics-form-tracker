/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@cft/core"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@cft/core": require("path").resolve(__dirname, "../../packages/core/src"),
    };
    return config;
  },
};

module.exports = nextConfig;
