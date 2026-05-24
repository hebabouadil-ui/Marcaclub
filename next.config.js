/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    minimumCacheTTL: 60,
    domains: ['res.cloudinary.com', 'localhost'],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '**.cjdropshipping.com' },
      { protocol: 'https', hostname: 'cjdropshipping.com' },
      { protocol: 'https', hostname: '**.cjimg.com' },
      { protocol: 'https', hostname: 'cjimg.com' },
      { protocol: 'https', hostname: '**.alicdn.com' },
      { protocol: 'https', hostname: 'alicdn.com' },
      { protocol: 'https', hostname: '**.aliyuncs.com' },
      { protocol: 'https', hostname: '**.cloudinary.com' },
    ],
  },
}

module.exports = nextConfig
