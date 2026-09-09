import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["192.168.1.1:3000", "192.168.1.1", "localhost:3000"],
};

export default nextConfig;
