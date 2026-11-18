import type { NextConfig } from "next";

export default {
  poweredByHeader: false,
  async redirects() {
    return [{ source: "/", destination: "/it", permanent: false }];
  },
} satisfies NextConfig;
