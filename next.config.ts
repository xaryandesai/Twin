import type { NextConfig } from 'next';

const repo = 'Twin';

const nextConfig: NextConfig = {
  output: 'export',
  // GitHub Pages serves project repos at /<repo-name>/
  // If you use a custom domain or a user page (username.github.io), remove basePath and assetPrefix.
  basePath: `/${repo}`,
  assetPrefix: `/${repo}/`,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
