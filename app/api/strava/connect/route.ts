import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Prefer the explicit env var in production. Self-hosting behind Infomaniak's
  // reverse proxy means `request.url` is built from the `Host` header the proxy
  // forwards to the Node process, not the public domain the visitor typed — when
  // that proxy doesn't set `X-Forwarded-Host`, Next.js falls back to the raw
  // Host header, which is the proxy's own upstream target (localhost:3000).
  // Only derive from the request when no env var is set, so local dev still
  // works without needing one.
  const redirectUri =
    process.env.STRAVA_REDIRECT_URI ?? new URL('/api/strava/callback', request.url).toString()
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
  })
  return NextResponse.redirect(`https://www.strava.com/oauth/authorize?${params.toString()}`)
}
