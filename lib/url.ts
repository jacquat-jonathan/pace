// Self-hosted behind Infomaniak's reverse proxy, `request.url` reflects the
// `Host` header the proxy forwards to the Node process rather than the public
// domain a visitor used — the proxy sets `X-Forwarded-Proto` but not
// `X-Forwarded-Host`, so Next.js falls back to the proxy's own upstream
// address (localhost). Prefer the explicit APP_URL env var for building
// absolute redirect targets, and only fall back to the request origin for
// local dev where no such proxy sits in front of the server.
export function appUrl(path: string, request: Request): URL {
  return new URL(path, process.env.APP_URL ?? request.url)
}
