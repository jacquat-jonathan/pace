import { createServerSupabase } from '@/lib/supabase/server'
import { getStravaTokens } from '@/lib/db/stravaTokens'
import { disconnectStrava } from './actions'

export default async function StravaSettingsPage() {
  const supabase = await createServerSupabase()
  const tokens = await getStravaTokens(supabase)

  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-xl font-semibold">Strava</h1>
      {tokens ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600">
            Connected (athlete #{tokens.athleteId}).{' '}
            {tokens.lastSyncedAt ? `Last synced ${tokens.lastSyncedAt}.` : 'Not synced yet.'}
          </p>
          <form action={disconnectStrava}>
            <button type="submit" className="rounded border px-3 py-1 text-sm">
              Disconnect
            </button>
          </form>
        </div>
      ) : (
        <a href="/api/strava/connect" className="inline-block rounded bg-[#fc4c02] px-3 py-1 text-sm text-white">
          Connect Strava
        </a>
      )}
    </div>
  )
}
