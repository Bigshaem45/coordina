import { ConvexReactClient } from 'convex/react';

// Read Convex URL from environment variables, trimming any trailing slashes or whitespace
// to prevent WebSocket 404 handshake failure caused by `cloud//api/1.49.0/sync`
const rawUrl = (import.meta.env.VITE_CONVEX_URL || 'https://sensible-elephant-183.eu-west-1.convex.cloud').trim();
const CONVEX_URL = rawUrl.replace(/\/+$/, '');

export const convex = new ConvexReactClient(CONVEX_URL);

export const isConvexConfigured = () => {
  return Boolean(import.meta.env.VITE_CONVEX_URL);
};

