/**
 * Utility functions for managing URL query parameters
 */

/**
 * Sets a query parameter in the URL without triggering a full page reload.
 * Uses replaceState to update the URL in place.
 */
export function setQueryParam(key: string, value: string): void {
  const url = new URL(window.location.href)
  url.searchParams.set(key, value)
  window.history.replaceState({}, '', url.toString())
}

/**
 * Removes a query parameter from the URL without triggering a full page reload.
 * Uses replaceState to update the URL in place.
 */
export function removeQueryParam(key: string): void {
  const url = new URL(window.location.href)
  url.searchParams.delete(key)
  window.history.replaceState({}, '', url.toString())
}
