import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*"],
  transpilePackages: ["@prisma/client"],
};

export default nextConfig;
