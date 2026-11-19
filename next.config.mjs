/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // /about and /guide were removed when the public site became a single
  // landing page. Redirects run before middleware, so old bookmarks land on
  // "/" instead of bouncing through /login to a 404. Not permanent until
  // we're sure those paths won't be reused.
  async redirects() {
    return [
      { source: "/about", destination: "/", permanent: false },
      { source: "/guide", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
