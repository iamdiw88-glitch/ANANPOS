/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  allowedDevOrigins: ['192.168.1.128'],
};

export default nextConfig;
