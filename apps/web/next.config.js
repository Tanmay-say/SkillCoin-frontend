/** @type {import('next').NextConfig} */

// Warn if NEXT_PUBLIC_API_URL is not set (will fallback to localhost)
if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn(
    "[SkillCoin] WARNING: NEXT_PUBLIC_API_URL is not set. " +
    "Set it in Vercel dashboard → Settings → Environment Variables " +
    "to point to your deployed API (e.g. https://api.skillcoin.xyz)."
  );
}

const nextConfig = {
  reactStrictMode: true,

  // Allow images from IPFS gateways for skill assets
  images: {
    domains: [
      "ipfs.io",
      "w3s.link",
      "cloudflare-ipfs.com",
    ],
  },

  // Security headers for production
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
