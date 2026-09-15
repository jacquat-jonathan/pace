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
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="w-fit rounded border px-3 py-1 text-sm"
      >
        {isPending ? 'Syncing…' : 'Sync now'}
      </button>
      {message && <p className="text-xs text-gray-500">{message}</p>}
    </div>
  )
}
