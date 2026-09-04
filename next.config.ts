import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  /** googleapis jest ogromne — nie bundluj go w dev (szybsze kompilacje API/drive). */
  serverExternalPackages: ["googleapis"],
  /** Zdjęcia nauczycieli (do 5 MB) idą przez Server Action uploadTutorPhoto. */
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost }]
        : []),
    ],
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
