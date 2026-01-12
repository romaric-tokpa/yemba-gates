/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Build standalone pour Docker
  output: 'standalone',

  // Optimisation des images
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/static/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Désactiver l'optimisation en production si nécessaire
    unoptimized: process.env.NODE_ENV === 'production' ? false : true,
  },

  // Variables d'environnement exposées au client
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },

  // Headers de sécurité
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Compression
  compress: true,

  // Power by header (masquer pour la sécurité)
  poweredByHeader: false,

  // Trailing slash
  trailingSlash: false,
}

module.exports = nextConfig
