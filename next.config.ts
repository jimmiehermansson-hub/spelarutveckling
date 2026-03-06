import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*"],
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
