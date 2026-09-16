import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Build the callback from the origin handling this request. This keeps local
  // development on localhost and production on its public domain, without a
  // deployment environment variable accidentally sending users back to local.
  const redirectUri = new URL('/api/strava/callback', request.url).toString()
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
  })
  return NextResponse.redirect(`https://www.strava.com/oauth/authorize?${params.toString()}`)
}
