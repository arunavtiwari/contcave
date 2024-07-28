/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo:true,
    appDir: true,
  },
  
  images: {
    domains: ["lh3.googleusercontent.com", "res.cloudinary.com", "127.0.0.1"],
  },
};

module.exports = nextConfig;
