import { createServerSupabase } from '@/lib/supabase/server'
import { getStravaTokens } from '@/lib/db/stravaTokens'
import { disconnectStrava } from './actions'
import { SyncNowButton } from './SyncNowButton'
import { ActivityTypeManager } from './ActivityTypeManager'
import { BUILTIN_ACTIVITY_TYPES, listCustomActivityTypes } from '@/lib/db/activityTypes'

export default async function StravaSettingsPage() {
  const supabase = await createServerSupabase()
  const [tokens, customActivityTypes] = await Promise.all([
    getStravaTokens(supabase),
    listCustomActivityTypes(supabase),
  ])

  return (
    <div className="page page-narrow">
      <header className="page-header"><div><p className="eyebrow">Preferences</p><h1 className="page-title">Settings</h1><p className="page-description">Manage the activities you train for and how completed sessions are imported.</p></div></header>
      <div className="section-stack max-w-2xl">
      <ActivityTypeManager builtInTypes={BUILTIN_ACTIVITY_TYPES} initialCustomTypes={customActivityTypes} />
      <div className="card">
      <div className="card-header"><div><h2 className="card-title">Strava connection</h2><p className="card-kicker">Import and match completed activities</p></div></div>
      <div className="card-body">
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
      </div>
    </div>
  )
}
