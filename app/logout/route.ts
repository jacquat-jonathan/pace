import { createServerSupabase } from '@/lib/supabase/server'
import { appUrl } from '@/lib/url'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  return NextResponse.redirect(appUrl('/login', request))
}
