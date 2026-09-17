// Supabase throws plain objects (e.g. PostgrestError: {message, details, hint,
// code}) rather than Error instances, so `err instanceof Error` alone misses
// them and falls through to a generic fallback message that hides the real
// cause. Fall back to a `.message` property before giving up entirely.
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message
  }
  return fallback
}
