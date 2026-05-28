/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure Next compiles and processes CSS from the local UI package
  transpilePackages: ["@payable-turborepo-starter/ui"],
};

export default nextConfig;
