import { createServerSupabase } from '@/lib/supabase/server'
import { getStravaTokens } from '@/lib/db/stravaTokens'
import { disconnectStrava } from './actions'
import { SyncNowButton } from './SyncNowButton'

export default async function StravaSettingsPage() {
  const supabase = await createServerSupabase()
  const tokens = await getStravaTokens(supabase)

  return (
    <div className="page page-narrow">
      <header className="page-header"><div><p className="eyebrow">Settings</p><h1 className="page-title">Strava connection</h1><p className="page-description">Keep your completed activities in sync with your training plan.</p></div></header>
      <div className="card card-body max-w-xl">
      {tokens ? (
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3"><span className="badge badge-linked mt-0.5">Connected</span><p className="m-0 text-sm leading-6 text-[#697379]">Athlete #{tokens.athleteId}<br />{tokens.lastSyncedAt ? `Last synced ${tokens.lastSyncedAt}.` : 'Ready for the first sync.'}</p></div>
          <SyncNowButton />
          <form action={disconnectStrava} className="border-t border-[#dddcd5] pt-4"><button type="submit" className="button button-danger">Disconnect Strava</button></form>
        </div>
      ) : (
        <div><h2 className="card-title">Bring your activities into Pace</h2><p className="page-description mb-5">Connect your account to import runs and automatically match them with planned sessions.</p><a href="/api/strava/connect" className="button button-primary">Connect Strava</a></div>
      )}
      </div>
    </div>
  )
}
