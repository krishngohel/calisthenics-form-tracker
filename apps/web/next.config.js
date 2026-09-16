const path = require("path");

/** Set CAPACITOR_BUILD=1 to emit a static export for the native iOS shell. */
const isCapacitorBuild = process.env.CAPACITOR_BUILD === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@cft/core"],
  reactStrictMode: true,
  ...(isCapacitorBuild
    ? { output: "export", trailingSlash: true, images: { unoptimized: true } }
    : {}),
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@cft/core": path.resolve(__dirname, "../../packages/core/src"),
    };
    return config;
  },
};

module.exports = nextConfig;
