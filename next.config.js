/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vision payloads (base64) are large; raise the server action body limit
  // and keep the image API route on the Node runtime (set in the route file).
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
};

module.exports = nextConfig;
