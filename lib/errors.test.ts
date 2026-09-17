import { describe, expect, it } from 'vitest'
import { errorMessage } from './errors'

describe('errorMessage', () => {
  it('reads the message from a real Error', () => {
    expect(errorMessage(new Error('boom'), 'fallback')).toBe('boom')
  })

  it('reads the message from a Supabase-style plain error object', () => {
    expect(errorMessage({ message: 'row not found', code: 'PGRST116' }, 'fallback')).toBe(
      'row not found',
    )
  })

  it('uses the fallback when nothing usable is present', () => {
    expect(errorMessage('just a string', 'fallback')).toBe('fallback')
    expect(errorMessage(null, 'fallback')).toBe('fallback')
    expect(errorMessage({}, 'fallback')).toBe('fallback')
  })
})
