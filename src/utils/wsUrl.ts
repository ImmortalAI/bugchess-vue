/**
 * Derives the WebSocket URL from VITE_API_URL.
 *
 * VITE_API_URL can be:
 *   - A relative path  => "/api"                      => wss://current-host/api/ws
 *   - An absolute URL  => "http://localhost:3000/api" => ws://localhost:3000/api/ws
 *                      => "https://api.example.com"   => wss://api.example.com/ws
 */
export function makeWsUrl(): string {
  const base = import.meta.env.VITE_API_URL as string;

  if (base.startsWith('/')) {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${window.location.host}${base}/ws`;
  }

  return (base + '/ws').replace(/^https?/, (p) => (p === 'https' ? 'wss' : 'ws'));
}
