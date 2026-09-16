'use client'

import { useState, useTransition } from 'react'
import { syncNow } from './actions'

export function SyncNowButton() {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function handleClick() {
    startTransition(async () => {
      const result = await syncNow()
      setMessage(
        result.ok
          ? `Imported ${result.imported}, matched ${result.matched}.`
          : `Sync failed: ${result.error}. Try disconnecting and reconnecting Strava above.`,
      )
    })
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="button button-primary"
      >
        {isPending ? 'Syncing…' : 'Sync now'}
      </button>
      {message && <p className="m-0 text-xs text-[#697379]">{message}</p>}
    </div>
  )
}
