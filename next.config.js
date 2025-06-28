import { withPayload } from '@payloadcms/next/withPayload'

const nextConfig = {
  // experimental: {
  //   reactCompiler: false,
  //   esmExternals: false,
  // },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
    ],
  },
}

export default withPayload(nextConfig)
