/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure Next compiles and processes CSS from the local UI package
  transpilePackages: ["@bridge/ui"],
};

export default nextConfig;
