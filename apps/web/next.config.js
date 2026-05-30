import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read root package.json version
const rootPkg = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf8"));
const version = rootPkg.version || "0.1.0";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure Next compiles and processes CSS from the local UI package
  transpilePackages: ["@payable-turborepo-starter/ui"],
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
};

export default nextConfig;
