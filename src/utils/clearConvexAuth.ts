/**
 * Utility to clear Convex auth state from localStorage
 * Use this if you get "No auth provider found" errors
 */

export function clearConvexAuthState() {
  // Clear all Convex-related items from localStorage
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('convex') || key.includes('auth'))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => {
    console.log('[Convex Auth] Clearing:', key);
    localStorage.removeItem(key);
  });

  console.log(`[Convex Auth] Cleared ${keysToRemove.length} items from localStorage`);

  // Reload the page to start fresh
  window.location.reload();
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).clearConvexAuth = clearConvexAuthState;
}
