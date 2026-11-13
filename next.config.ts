import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The embedded Postgres used for local development must not be bundled.
  serverExternalPackages: ['@electric-sql/pglite'],
  async headers() {
    return [
      { source: '/duckdb/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] },
      { source: '/data/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }] },
    ];
  },
};

export default nextConfig;
