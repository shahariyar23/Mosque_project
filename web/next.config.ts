import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  allowedDevOrigins: ["noor.mostak.tech", "uttara.mostak.tech", "north.mostak.tech"],
};

export default nextConfig;
