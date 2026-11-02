/**
 * Global Error Handler for COORDINA
 *
 * 1. Directs full technical error details, stack traces, and Convex request IDs to the browser console.
 * 2. Prevents raw server traces from leaking onto the frontend UI.
 * 3. Returns concise, human-friendly messages safe for UI presentation.
 */

export function reportError(context: string, err: unknown): void {
  console.error(`[COORDINA ${context}]`, err);
}

export function cleanErrorMessage(
  err: unknown,
  fallback = 'Something went wrong. Please check the console or try again.'
): string {
  // Always log full technical error to developer console
  console.error('[COORDINA Error Caught]:', err);

  if (!err) return fallback;

  let message = '';
  if (typeof err === 'string') {
    message = err;
  } else if (err instanceof Error) {
    message = err.message;
  } else if (typeof (err as any)?.message === 'string') {
    message = (err as any).message;
  } else {
    return fallback;
  }

  // Strip Convex server prefixes & stack traces
  // e.g., "[CONVEX M(auth:signIn)] [Request ID: ...] Server Error Uncaught Error: Real error text at handler ..."
  if (message.includes('Uncaught Error:')) {
    message = message.split('Uncaught Error:')[1] || message;
  }
  if (message.includes('Server Error')) {
    message = message.split('Server Error')[1] || message;
  }
  if (message.includes('at handler')) {
    message = message.split('at handler')[0] || message;
  }
  if (message.includes('Called by client')) {
    message = message.split('Called by client')[0] || message;
  }

  // Clean leading colons, whitespace, brackets
  message = message.replace(/^[:\s\-]+/, '').trim();

  // If the message still looks like an unparsed stack trace or internal protocol error, return fallback
  if (
    message.includes('[CONVEX') ||
    message.includes('Request ID:') ||
    message.includes('node_modules') ||
    message.includes('TypeError:') ||
    message.length > 150
  ) {
    return fallback;
  }

  return message || fallback;
}

