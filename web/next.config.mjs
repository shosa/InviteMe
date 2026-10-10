import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: root,
  transpilePackages: ["@inviteme/shared"],
  // Il frontend inoltra /api/* all'API: stessa origine per il browser, quindi cookie di sessione semplici.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API}/api/:path*` }];
  },
};

export default nextConfig;
