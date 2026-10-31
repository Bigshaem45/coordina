import { ConvexReactClient } from 'convex/react';

// Read Convex URL from environment variables, fallback to local dev or preview
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL || 'https://friendly-stoat-984.convex.cloud';

export const convex = new ConvexReactClient(CONVEX_URL);

export const isConvexConfigured = () => {
  return Boolean(import.meta.env.VITE_CONVEX_URL);
};

