import { login } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3"><span className="brand-mark text-white">P</span><div><strong className="block text-xl tracking-tight">Pace</strong><span className="text-xs text-[#697379]">Train with intention</span></div></div>
        <div className="card p-7 sm:p-9">
          <p className="eyebrow">Welcome back</p><h1 className="page-title !text-3xl">Sign in to your training</h1><p className="page-description mb-6">Your plan, history, and progress are waiting.</p>
          {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <form action={login} className="flex flex-col gap-4">
            <label className="field">Email<input name="email" type="email" placeholder="you@example.com" required className="control" /></label>
            <label className="field">Password<input name="password" type="password" placeholder="Your password" required className="control" /></label>
            <button type="submit" className="button button-primary mt-2">Sign in</button>
          </form>
        </div>
      </div>
    </main>
  )
}
