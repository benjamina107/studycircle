import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: { proxyClientMaxBodySize: 32_000_000 },
};

export default nextConfig;
