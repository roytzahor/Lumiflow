import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "date-fns", "driver.js", "sonner"],
  },
  webpack: (config, { dev }) => {
    if (dev && config.output && typeof config.output === "object") {
      // Dev machines on slow disks / AV scans can hit the default chunk load timeout.
      config.output.chunkLoadTimeout = 300_000;
    }
    return config;
  },
};

export default nextConfig;
