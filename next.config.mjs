/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
  // This sandbox's build has no network access to fonts.googleapis.com —
  // Next's automatic webfont optimization would otherwise emit a benign
  // but alarming-looking CssSyntaxError at build time trying to inline the
  // <link> tag in app/layout.tsx. See README, "What's real vs. simulated".
  optimizeFonts: false,
};
export default nextConfig;
