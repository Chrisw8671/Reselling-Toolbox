import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.1.4",
    "10.5.0.2",
    "localhost",
  ],

  devIndicators: false,
};

export default nextConfig;